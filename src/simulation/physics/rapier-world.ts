import * as RAPIER from '@dimforge/rapier3d-compat';
import {
  BoundaryDetector,
  type DohyoSpec,
  type DriveCommand,
  NEUTRAL_DRIVE_COMMAND,
  PRACTICE_PUSHABLE_OBJECT_SPEC,
  PRACTICE_RIVAL_TYPE,
  type Pose2,
  ROUND_OUTCOME,
  type RobotSpec,
  type RoundOutcome,
  type PracticeRivalType,
} from '../../domain/index';
import {
  calculateDifferentialWheelSpeeds,
  PRACTICE_DRIVE_CONFIG,
  type DifferentialDriveConfig,
} from './differential-drive';
import { createRobotCollisionVertices } from '../robot-geometry';
import { RIVAL_SPEED_SCALE, RIVAL_TRACTION_SCALE } from '../drive-tuning';

export const DOHYO_SURFACE_THICKNESS = 0.006;
export const DOHYO_SURFACE_TOP = 0;
export const START_LINE_OFFSET = 0.05;
const ROBOT_WHEEL_RADIUS = 0.016;
const ROBOT_WHEEL_VERTICAL_OFFSET = -0.009;
const ROBOT_CENTER_OF_MASS_HEIGHT_RATIO = 0.3;
const DRIVE_RESPONSE = 30;
const LATERAL_RESPONSE = 14;
const VIRTUAL_TIRE_FRICTION = 0.8;
const MAX_YAW_ACCELERATION = 26;
const MAX_COLLISION_SPEED_SCALE = 1.5;
const MAX_COLLISION_YAW_RATE_DEVIATION_SCALE = 0.25;

export function calculateInitialRobotPose(dohyo: DohyoSpec, robot: RobotSpec): Pose2 {
  const startCenterOffset = START_LINE_OFFSET + robot.depth / 2;
  const rearCornerOffset = START_LINE_OFFSET + robot.depth;
  const footprintRadius = Math.hypot(robot.width / 2, rearCornerOffset);
  if (footprintRadius >= dohyo.innerRadius) {
    throw new RangeError('dohyo is too small for the official starting pose.');
  }

  // Place the leading edge on the +5 cm starting line. Local -Z points toward
  // the center at yaw 0; the rival is mirrored onto the opposite line.
  return { x: 0, y: startCenterOffset, yaw: 0 };
}

export function calculateInitialRivalPose(dohyo: DohyoSpec, robot: RobotSpec): Pose2 {
  const playerPose = calculateInitialRobotPose(dohyo, robot);
  return { x: -playerPose.x, y: -playerPose.y, yaw: Math.PI };
}

export interface RobotPhysicsSnapshot {
  readonly pose: Pose2;
  readonly verticalPosition: number;
  readonly speed: number;
  readonly yawRate: number;
}

export interface PhysicsSnapshot extends RobotPhysicsSnapshot {
  readonly rival: RobotPhysicsSnapshot;
  readonly rivalType: PracticeRivalType;
}

let rapierInitialization: Promise<void> | undefined;

/** Rapier's WASM runtime is shared by every simulation instance. */
export function initializeRapier(): Promise<void> {
  rapierInitialization ??= RAPIER.init();
  return rapierInitialization;
}

function yawRotation(yaw: number): RAPIER.Rotation {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
}

function yawFromRotation(rotation: RAPIER.Rotation): number {
  return Math.atan2(
    2 * (rotation.w * rotation.y + rotation.x * rotation.z),
    1 - 2 * (rotation.y * rotation.y + rotation.x * rotation.x),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moveTowards(current: number, target: number, maxDelta: number): number {
  return current + clamp(target - current, -maxDelta, maxDelta);
}

export class RapierWorld {
  public static async create(
    dohyo: DohyoSpec,
    robot: RobotSpec,
    drive: DifferentialDriveConfig = PRACTICE_DRIVE_CONFIG,
  ): Promise<RapierWorld> {
    await initializeRapier();
    return new RapierWorld(dohyo, robot, drive);
  }

  private readonly world: RAPIER.World;
  private readonly dohyoCollider: RAPIER.Collider;
  private readonly robotBody: RAPIER.RigidBody;
  private readonly rivalBody: RAPIER.RigidBody;
  private readonly cylinderBody: RAPIER.RigidBody;
  private readonly boundaryDetector: BoundaryDetector;
  private readonly dohyo: DohyoSpec;
  private readonly robot: RobotSpec;
  private readonly drive: DifferentialDriveConfig;
  private readonly initialPose: Pose2;
  private readonly initialRivalPose: Pose2;
  private readonly initialCylinderPose: Pose2 = { x: 0, y: 0, yaw: 0 };
  private rivalType: PracticeRivalType = PRACTICE_RIVAL_TYPE.MINISUMO;
  private disposed = false;

  private constructor(dohyo: DohyoSpec, robot: RobotSpec, drive: DifferentialDriveConfig) {
    this.dohyo = dohyo;
    this.robot = robot;
    this.drive = drive;
    this.initialPose = calculateInitialRobotPose(dohyo, robot);
    this.initialRivalPose = calculateInitialRivalPose(dohyo, robot);
    this.boundaryDetector = new BoundaryDetector(dohyo, robot);
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 120;
    this.world.maxCcdSubsteps = 2;
    this.world.numSolverIterations = 8;

    this.dohyoCollider = this.createDohyoSurface();
    this.robotBody = this.createRobotBody(this.initialPose);
    this.rivalBody = this.createRobotBody(this.initialRivalPose);
    this.cylinderBody = this.createCylinderBody(this.initialCylinderPose);
    this.haltBody(this.cylinderBody);
    // Materialize mass properties and broad-phase support before the first
    // player-controlled frame; collider attachment finalizes them on a step.
    this.world.step();
  }

  public get snapshot(): PhysicsSnapshot {
    this.assertNotDisposed();
    return this.readSnapshot();
  }

  public setRivalType(rivalType: PracticeRivalType): PhysicsSnapshot {
    this.assertNotDisposed();
    if (this.rivalType === rivalType) return this.readSnapshot();

    this.rivalType = rivalType;
    if (rivalType === PRACTICE_RIVAL_TYPE.MINISUMO) {
      this.haltBody(this.cylinderBody);
      this.resetBody(this.rivalBody, this.initialRivalPose, this.robot.height);
    } else {
      this.haltBody(this.rivalBody);
      this.resetCylinderBody();
    }
    this.world.propagateModifiedBodyPositionsToColliders();
    return this.readSnapshot();
  }

  public step(
    command: DriveCommand,
    rivalCommand: DriveCommand = NEUTRAL_DRIVE_COMMAND,
  ): PhysicsSnapshot {
    this.assertNotDisposed();
    const rivalBody = this.activeRivalBody;
    for (const body of [this.robotBody, rivalBody]) {
      if (body.isValid() && body.isSleeping()) {
        body.wakeUp();
      }
    }
    this.applyDrive(this.robotBody, command);
    if (this.rivalType === PRACTICE_RIVAL_TYPE.MINISUMO) {
      this.applyDrive(this.rivalBody, rivalCommand);
    }
    this.world.step();
    this.limitCollisionVelocity(this.robotBody, command);
    if (this.rivalType === PRACTICE_RIVAL_TYPE.MINISUMO) {
      this.limitCollisionVelocity(this.rivalBody, rivalCommand);
    } else {
      this.updateCylinderSupport();
    }
    return this.readSnapshot();
  }

  public getRoundOutcome(): RoundOutcome | null {
    this.assertNotDisposed();
    const snapshot = this.readSnapshot();
    const playerOut = this.boundaryDetector.isOut(snapshot.pose);
    const rivalOut =
      this.rivalType === PRACTICE_RIVAL_TYPE.MINISUMO
        ? this.boundaryDetector.isOut(snapshot.rival.pose)
        : this.isCylinderFullyOut(snapshot.rival.pose);

    if (playerOut && rivalOut) return ROUND_OUTCOME.BOTH_SCORE;
    if (playerOut) return ROUND_OUTCOME.RIVAL_SCORES;
    if (rivalOut) return ROUND_OUTCOME.PLAYER_SCORES;
    return null;
  }

  /** Returns whether Rapier currently has solver contacts between the robots. */
  public hasRobotContact(): boolean {
    this.assertNotDisposed();
    let hasContact = false;
    const playerCollider = this.robotBody.collider(0);
    const rivalCollider = this.rivalBody.collider(0);

    this.world.contactPair(playerCollider, rivalCollider, (manifold) => {
      if (manifold.numSolverContacts() > 0) {
        hasContact = true;
      }
    });

    return hasContact;
  }

  /** Returns whether Rapier currently has solver contacts with the selected rival. */
  public hasRivalContact(): boolean {
    this.assertNotDisposed();
    let hasContact = false;
    const rivalCollider = this.activeRivalBody.collider(0);

    this.world.contactPair(this.robotBody.collider(0), rivalCollider, (manifold) => {
      if (manifold.numSolverContacts() > 0) hasContact = true;
    });

    return hasContact;
  }

  public halt(): void {
    this.assertNotDisposed();
    this.haltBody(this.robotBody);
    this.haltBody(this.rivalBody);
    this.haltBody(this.cylinderBody);
  }

  public reset(): PhysicsSnapshot {
    this.assertNotDisposed();
    this.resetBody(this.robotBody, this.initialPose, this.robot.height);
    if (this.rivalType === PRACTICE_RIVAL_TYPE.MINISUMO) {
      this.haltBody(this.cylinderBody);
      this.resetBody(this.rivalBody, this.initialRivalPose, this.robot.height);
    } else {
      this.haltBody(this.rivalBody);
      this.resetCylinderBody();
    }
    this.world.propagateModifiedBodyPositionsToColliders();
    return this.readSnapshot();
  }

  public dispose(): void {
    if (!this.disposed) {
      this.world.free();
      this.disposed = true;
    }
  }

  private haltBody(body: RAPIER.RigidBody): void {
    body.resetForces(true);
    body.resetTorques(true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setEnabled(false);
  }

  private resetBody(body: RAPIER.RigidBody, pose: Pose2, height: number): void {
    body.setEnabled(true);
    body.setEnabledTranslations(true, false, true, true);
    body.resetForces(true);
    body.resetTorques(true);
    body.setTranslation(
      {
        x: pose.x,
        y: height / 2 + 0.002,
        z: pose.y,
      },
      true,
    );
    body.setRotation(yawRotation(pose.yaw), true);
    body.setGravityScale(0, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  private get activeRivalBody(): RAPIER.RigidBody {
    return this.rivalType === PRACTICE_RIVAL_TYPE.MINISUMO ? this.rivalBody : this.cylinderBody;
  }

  private resetCylinderBody(): void {
    const body = this.cylinderBody;
    body.setEnabled(true);
    body.setEnabledTranslations(true, false, true, true);
    body.setEnabledRotations(false, true, false, true);
    body.resetForces(true);
    body.resetTorques(true);
    body.setTranslation(
      {
        x: this.initialCylinderPose.x,
        y: PRACTICE_PUSHABLE_OBJECT_SPEC.height / 2,
        z: this.initialCylinderPose.y,
      },
      true,
    );
    body.setRotation(yawRotation(this.initialCylinderPose.yaw), true);
    body.setGravityScale(0, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  private isCylinderFullyOut(pose: Pose2): boolean {
    return (
      Math.hypot(pose.x, pose.y) >
      this.dohyo.outerRadius + PRACTICE_PUSHABLE_OBJECT_SPEC.radius
    );
  }

  private updateCylinderSupport(): void {
    const body = this.cylinderBody;
    const translation = body.translation();
    const velocity = body.linvel();
    const pose = { x: translation.x, y: translation.z, yaw: yawFromRotation(body.rotation()) };
    if (this.isCylinderFullyOut(pose)) {
      body.setEnabledTranslations(true, true, true, true);
      body.setGravityScale(1, true);
      return;
    }

    body.setEnabledTranslations(true, false, true, true);
    const groundHeight = PRACTICE_PUSHABLE_OBJECT_SPEC.height / 2;
    if (Math.abs(translation.y - groundHeight) > 0.0001) {
      body.setTranslation({ x: translation.x, y: groundHeight, z: translation.z }, true);
    }
    body.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);
    body.setGravityScale(0, true);
  }

  private createDohyoSurface(): RAPIER.Collider {
    const segments = 96;
    const vertices = new Float32Array((segments + 1) * 3);
    const indices = new Uint32Array(segments * 3);
    // A center vertex plus one ring creates a flat disk. It has no side faces,
    // so the edge cannot act as a hidden vertical barrier in Rapier.
    for (let index = 0; index < segments; index += 1) {
      const offset = (index + 1) * 3;
      const angle = (index / segments) * Math.PI * 2;
      vertices[offset] = Math.cos(angle) * this.dohyo.outerRadius;
      vertices[offset + 1] = DOHYO_SURFACE_TOP;
      vertices[offset + 2] = Math.sin(angle) * this.dohyo.outerRadius;
      const nextOffset = (((index + 1) % segments) + 1) * 3;
      const triangleOffset = index * 3;
      // Reverse winding gives the disk an upward (+Y) normal.
      indices[triangleOffset] = 0;
      indices[triangleOffset + 1] = nextOffset / 3;
      indices[triangleOffset + 2] = offset / 3;
    }

    const surfaceBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const surfaceCollider = RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setDensity(0)
      // Traction is supplied by the virtual wheel controller below. Nonzero
      // floor friction would create a second, conflicting drive model.
      .setFriction(0)
      .setRestitution(0)
      // The disk is queried for support, but physical contact across the
      // triangle fan introduces edge impulses into the robot's chassis.
      .setSensor(true);

    // This is a finite floor only. There are deliberately no perimeter faces:
    // the boundary rule below, not a collider, decides when the robot is out.
    return this.world.createCollider(surfaceCollider, surfaceBody);
  }

  private createRobotBody(pose: Pose2): RAPIER.RigidBody {
    const mass = this.robot.mass;
    const inertia: RAPIER.Vector = {
      x: (mass * (this.robot.height ** 2 + this.robot.depth ** 2)) / 12,
      y: (mass * (this.robot.width ** 2 + this.robot.depth ** 2)) / 12,
      z: (mass * (this.robot.width ** 2 + this.robot.height ** 2)) / 12,
    };
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pose.x, this.robot.height / 2 + 0.002, pose.y)
        .setRotation(yawRotation(pose.yaw))
        .setGravityScale(0)
        .setLinearDamping(1.6)
        .setAngularDamping(0.6)
        .setCcdEnabled(true)
        .setSoftCcdPrediction(0.01)
        // Keep the chassis in the dohyo plane; only unlock vertical motion
        // after it has fully lost floor support.
        .enabledTranslations(true, false, true)
        .enabledRotations(false, true, false)
        .setCanSleep(false),
    );

    const chassis = RAPIER.ColliderDesc.convexHull(createRobotCollisionVertices(this.robot));
    if (!chassis) {
      throw new Error('No se pudo construir la geometría física del robot.');
    }
    chassis.setDensity(0).setFriction(0.35).setRestitution(0).setContactSkin(0.0004);
    this.world.createCollider(chassis, body);
    // Collider creation recomputes body mass from collider densities, so set
    // the explicit robot mass and inertia only after all colliders are attached.
    body.setAdditionalMassProperties(
      mass,
      { x: 0, y: -this.robot.height * ROBOT_CENTER_OF_MASS_HEIGHT_RATIO, z: 0 },
      inertia,
      { x: 0, y: 0, z: 0, w: 1 },
      true,
    );

    return body;
  }

  private createCylinderBody(pose: Pose2): RAPIER.RigidBody {
    const spec = PRACTICE_PUSHABLE_OBJECT_SPEC;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pose.x, spec.height / 2, pose.y)
        .setRotation(yawRotation(pose.yaw))
        .setGravityScale(0)
        .setLinearDamping(1.2)
        .setAngularDamping(0.8)
        .setCcdEnabled(true)
        .enabledTranslations(true, false, true)
        .enabledRotations(false, true, false)
        .setCanSleep(false),
    );
    const collider = RAPIER.ColliderDesc.cylinder(spec.height / 2, spec.radius)
      .setDensity(0)
      .setFriction(0.2)
      .setRestitution(0.02)
      .setContactSkin(0.0002);
    this.world.createCollider(collider, body);
    body.setAdditionalMass(spec.mass, true);
    return body;
  }

  private applyDrive(body: RAPIER.RigidBody, command: DriveCommand): void {
    if (!body.isEnabled()) return;

    const wheelSpeeds = calculateDifferentialWheelSpeeds(
      command.throttle,
      command.steering,
      this.drive,
    );
    const rotation = body.rotation();
    const yaw = yawFromRotation(rotation);
    // The robot's front is local -Z. Rapier/Three yaw therefore maps that
    // direction to {-sin(yaw), -cos(yaw)} in the X/Z plane.
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const translation = body.translation();
    const velocity = body.linvel();
    const forwardVelocity = velocity.x * forward.x + velocity.z * forward.z;
    const lateralVelocity = velocity.x * right.x + velocity.z * right.z;
    const mass = body.mass();
    let groundedWheels = 0;

    for (const side of [-1, 1] as const) {
      const lateralOffset = side * (this.drive.trackWidth / 2);
      const wheelCenter = {
        x: translation.x + right.x * lateralOffset,
        y: translation.y + ROBOT_WHEEL_VERTICAL_OFFSET,
        z: translation.z + right.z * lateralOffset,
      };
      const support = this.world.castRay(
        new RAPIER.Ray(wheelCenter, { x: 0, y: -1, z: 0 }),
        ROBOT_WHEEL_RADIUS + 0.004,
        true,
        undefined,
        undefined,
        undefined,
        body,
      );
      const supported = Boolean(support && support.collider.handle === this.dohyoCollider.handle);
      if (!supported) continue;

      groundedWheels += 1;
    }

    if (groundedWheels > 0) {
      // Model the two motors as a bounded velocity controller instead of
      // physical cylinders. Continuous force is important here: setting
      // velocity alone makes the solver cancel all motion during a collision.
      const supportScale = groundedWheels / 2;
      const targetForwardSpeed = (wheelSpeeds.left + wheelSpeeds.right) / 2;
      const maxTractionForce = mass * 9.81 * VIRTUAL_TIRE_FRICTION * supportScale;
      const motorTractionScale = body === this.rivalBody ? RIVAL_TRACTION_SCALE : 1;
      const longitudinalForce = clamp(
        (targetForwardSpeed - forwardVelocity) * DRIVE_RESPONSE * mass,
        -maxTractionForce * motorTractionScale,
        maxTractionForce * motorTractionScale,
      );
      const lateralForce = clamp(
        -lateralVelocity * LATERAL_RESPONSE * mass,
        -maxTractionForce,
        maxTractionForce,
      );
      body.setEnabledTranslations(true, false, true, true);
      const groundHeight = this.robot.height / 2 + 0.002;
      if (Math.abs(translation.y - groundHeight) > 0.0001) {
        body.setTranslation({ x: translation.x, y: groundHeight, z: translation.z }, true);
      }
      body.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);
      body.addForce(
        {
          x: forward.x * longitudinalForce + right.x * lateralForce,
          y: 0,
          z: forward.z * longitudinalForce + right.z * lateralForce,
        },
        true,
      );
      body.setGravityScale(0, true);
      const nextYawRate = moveTowards(
        body.angvel().y,
        wheelSpeeds.yawRate,
        MAX_YAW_ACCELERATION * this.world.timestep * supportScale,
      );
      body.setAngvel({ x: 0, y: nextYawRate, z: 0 }, true);
    } else if (!this.boundaryDetector.isOut({ x: translation.x, y: translation.z, yaw })) {
      // A wheel can lose edge support before the full chassis leaves. Keep the
      // body in the dohyo plane until its complete footprint has exited; this
      // prevents an opponent's ramp from launching the still-scoring robot.
      body.setEnabledTranslations(true, false, true, true);
      const groundHeight = this.robot.height / 2 + 0.002;
      if (Math.abs(translation.y - groundHeight) > 0.0001) {
        body.setTranslation({ x: translation.x, y: groundHeight, z: translation.z }, true);
      }
      body.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);
      body.setGravityScale(0, true);
    } else {
      body.setEnabledTranslations(true, true, true, true);
      body.setGravityScale(1, true);
    }
  }

  private limitCollisionVelocity(body: RAPIER.RigidBody, command: DriveCommand): void {
    if (!body.isEnabled()) return;

    const velocity = body.linvel();
    const speed = Math.hypot(velocity.x, velocity.z);
    const speedScale = body === this.rivalBody ? RIVAL_SPEED_SCALE : 1;
    const maxSpeed = this.drive.maxWheelSpeed * speedScale * MAX_COLLISION_SPEED_SCALE;
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      body.setLinvel({ x: velocity.x * scale, y: velocity.y, z: velocity.z * scale }, true);
    }

    const commandedYawRate = calculateDifferentialWheelSpeeds(
      command.throttle,
      command.steering,
      this.drive,
    ).yawRate;
    const maxYawRate = Math.min(
      this.drive.maxYawRate * speedScale,
      Math.abs(commandedYawRate) +
        this.drive.maxYawRate * speedScale * MAX_COLLISION_YAW_RATE_DEVIATION_SCALE,
    );
    const yawRate = body.angvel().y;
    if (Math.abs(yawRate) > maxYawRate) {
      body.setAngvel({ x: 0, y: Math.sign(yawRate) * maxYawRate, z: 0 }, true);
    }
  }

  private readSnapshot(): PhysicsSnapshot {
    const player = this.readRobotSnapshot(this.robotBody);
    const rival = this.readRobotSnapshot(this.activeRivalBody);
    return {
      ...player,
      rival,
      rivalType: this.rivalType,
    };
  }

  private readRobotSnapshot(body: RAPIER.RigidBody): RobotPhysicsSnapshot {
    const translation = body.translation();
    const rotation = body.rotation();
    const velocity = body.linvel();

    return {
      pose: {
        x: translation.x,
        y: translation.z,
        yaw: yawFromRotation(rotation),
      },
      verticalPosition: translation.y,
      speed: Math.hypot(velocity.x, velocity.z),
      yawRate: body.angvel().y,
    };
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('The Rapier simulation has already been disposed.');
    }
  }
}
