import * as RAPIER from '@dimforge/rapier3d-compat';
import {
  BoundaryDetector,
  type DohyoSpec,
  type DriveCommand,
  type Pose2,
  PRACTICE_PUSHABLE_OBJECT_SPEC,
  type PushableObjectSpec,
  type RobotSpec,
} from '../../domain/index';
import {
  calculateDifferentialWheelSpeeds,
  PRACTICE_DRIVE_CONFIG,
  type DifferentialDriveConfig,
} from './differential-drive';

export const DOHYO_SURFACE_THICKNESS = 0.006;
export const DOHYO_SURFACE_TOP = 0;
export const INITIAL_ROBOT_EDGE_MARGIN = 0.01;
export const PUSHABLE_OBJECT_SAFETY_MARGIN = 0.01;

export function calculateInitialRobotPose(dohyo: DohyoSpec, robot: RobotSpec): Pose2 {
  const footprintRadius = Math.hypot(robot.width / 2, robot.depth / 2);
  const centerRadius = dohyo.innerRadius - footprintRadius - INITIAL_ROBOT_EDGE_MARGIN;
  if (centerRadius <= 0) {
    throw new RangeError('dohyo is too small for a safe edge starting pose.');
  }

  // Start near the inner edge, facing the center: local -Z points toward
  // decreasing world-Z at yaw 0.
  return { x: 0, y: centerRadius, yaw: 0 };
}

export function calculateInitialPushableObjectPose(
  dohyo: DohyoSpec,
  object: PushableObjectSpec,
): Pose2 {
  if (dohyo.innerRadius - object.radius - PUSHABLE_OBJECT_SAFETY_MARGIN <= 0) {
    throw new RangeError('dohyo is too small for a safe pushable object starting pose.');
  }

  // Start at the center so the robot can push the target through the entire dohyo.
  return { x: 0, y: 0, yaw: 0 };
}

export interface PushableObjectSnapshot {
  readonly pose: Pose2;
  readonly verticalPosition: number;
}

export interface PhysicsSnapshot {
  readonly pose: Pose2;
  readonly verticalPosition: number;
  readonly speed: number;
  readonly yawRate: number;
  readonly pushableObject: PushableObjectSnapshot;
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

export class RapierWorld {
  public static async create(
    dohyo: DohyoSpec,
    robot: RobotSpec,
    drive: DifferentialDriveConfig = PRACTICE_DRIVE_CONFIG,
    pushableObject: PushableObjectSpec = PRACTICE_PUSHABLE_OBJECT_SPEC,
  ): Promise<RapierWorld> {
    await initializeRapier();
    return new RapierWorld(dohyo, robot, drive, pushableObject);
  }

  private readonly world: RAPIER.World;
  private readonly robotBody: RAPIER.RigidBody;
  private readonly pushableObjectBody: RAPIER.RigidBody;
  private readonly boundaryDetector: BoundaryDetector;
  private readonly dohyo: DohyoSpec;
  private readonly robot: RobotSpec;
  private readonly pushableObject: PushableObjectSpec;
  private readonly drive: DifferentialDriveConfig;
  private readonly initialPose: Pose2;
  private readonly initialPushableObjectPose: Pose2;
  private disposed = false;

  private constructor(
    dohyo: DohyoSpec,
    robot: RobotSpec,
    drive: DifferentialDriveConfig,
    pushableObject: PushableObjectSpec,
  ) {
    this.dohyo = dohyo;
    this.robot = robot;
    this.pushableObject = pushableObject;
    this.drive = drive;
    this.initialPose = calculateInitialRobotPose(dohyo, robot);
    this.initialPushableObjectPose = calculateInitialPushableObjectPose(dohyo, pushableObject);
    this.boundaryDetector = new BoundaryDetector(dohyo, robot);
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 120;
    this.world.maxCcdSubsteps = 2;
    this.world.numSolverIterations = 8;

    this.createDohyoSurface();
    this.robotBody = this.createRobotBody();
    this.pushableObjectBody = this.createPushableObjectBody();
  }

  public get snapshot(): PhysicsSnapshot {
    this.assertNotDisposed();
    return this.readSnapshot();
  }

  public step(command: DriveCommand): PhysicsSnapshot {
    this.assertNotDisposed();
    for (const body of [this.robotBody, this.pushableObjectBody]) {
      if (body.isValid() && body.isSleeping()) {
        body.wakeUp();
      }
    }
    this.applyDrive(command);
    this.world.step();
    return this.readSnapshot();
  }

  public isBoundaryOut(): boolean {
    this.assertNotDisposed();
    const snapshot = this.readSnapshot();
    return this.boundaryDetector.isOut(snapshot.pose) || snapshot.verticalPosition < -0.06;
  }

  public halt(): void {
    this.assertNotDisposed();
    this.haltBody(this.robotBody);
    this.haltBody(this.pushableObjectBody);
  }

  public reset(): PhysicsSnapshot {
    this.assertNotDisposed();
    this.resetBody(this.robotBody, this.initialPose, this.robot.height);
    this.resetBody(
      this.pushableObjectBody,
      this.initialPushableObjectPose,
      this.pushableObject.height,
    );
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
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  private createDohyoSurface(): void {
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
      .setFriction(1.25)
      .setRestitution(0);

    // This is a finite floor only. There are deliberately no perimeter faces:
    // the boundary rule below, not a collider, decides when the robot is out.
    this.world.createCollider(surfaceCollider, surfaceBody);
  }

  private createRobotBody(): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(this.initialPose.x, this.robot.height / 2 + 0.002, this.initialPose.y)
        .setGravityScale(1)
        .setLinearDamping(1.6)
        .setAngularDamping(3.2)
        .setAdditionalMass(this.robot.mass)
        .setCcdEnabled(true)
        .setSoftCcdPrediction(0.01)
        .enabledTranslations(true, true, true)
        .enabledRotations(false, true, false)
        .setCanSleep(false),
    );

    const chassis = RAPIER.ColliderDesc.cuboid(
      this.robot.width / 2,
      this.robot.height / 2,
      this.robot.depth / 2,
    )
      .setDensity(0)
      .setFriction(0.35)
      .setRestitution(0)
      .setContactSkin(0.0004);
    this.world.createCollider(chassis, body);

    const wheelRadius = 0.016;
    const wheelHalfWidth = 0.006;
    const wheelRotation: RAPIER.Rotation = {
      x: 0,
      y: 0,
      z: Math.sin(Math.PI / 4),
      w: Math.cos(Math.PI / 4),
    };
    for (const side of [-1, 1]) {
      const wheel = RAPIER.ColliderDesc.cylinder(wheelHalfWidth, wheelRadius)
        .setTranslation(side * (this.drive.trackWidth / 2), -0.009, 0)
        .setRotation(wheelRotation)
        .setDensity(0)
        .setFriction(0.8)
        .setRestitution(0)
        .setContactSkin(0.0002);
      this.world.createCollider(wheel, body);
    }

    return body;
  }

  private createPushableObjectBody(): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(
          this.initialPushableObjectPose.x,
          this.pushableObject.height / 2 + 0.002,
          this.initialPushableObjectPose.y,
        )
        .setGravityScale(1)
        .setLinearDamping(1.4)
        .setAngularDamping(3)
        .setAdditionalMass(this.pushableObject.mass)
        .setCcdEnabled(true)
        .setSoftCcdPrediction(0.01)
        .enabledTranslations(true, true, true)
        .enabledRotations(false, true, false)
        .setCanSleep(false),
    );

    const cylinder = RAPIER.ColliderDesc.cylinder(
      this.pushableObject.height / 2,
      this.pushableObject.radius,
    )
      .setDensity(0)
      .setFriction(0.2)
      .setRestitution(0.02)
      .setContactSkin(0.0002);
    this.world.createCollider(cylinder, body);

    return body;
  }

  private applyDrive(command: DriveCommand): void {
    const wheelSpeeds = calculateDifferentialWheelSpeeds(
      command.throttle,
      command.steering,
      this.drive,
    );
    const rotation = this.robotBody.rotation();
    const yaw = yawFromRotation(rotation);
    // The robot's front is local -Z. Rapier/Three yaw therefore maps that
    // direction to {-sin(yaw), -cos(yaw)} in the X/Z plane.
    const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
    const right = { x: Math.cos(yaw), z: -Math.sin(yaw) };
    const velocity = this.robotBody.linvel();
    const forwardVelocity = velocity.x * forward.x + velocity.z * forward.z;
    const lateralVelocity = velocity.x * right.x + velocity.z * right.z;

    // The wheel pair determines a target forward speed and yaw rate. A bounded
    // force/torque controller gets there smoothly and brakes when the keys lift.
    const forwardAcceleration = clamp((wheelSpeeds.forwardSpeed - forwardVelocity) * 30, -10, 10);
    const lateralAcceleration = clamp(-lateralVelocity * 14, -6, 6);
    const mass = this.robotBody.mass();
    this.robotBody.addForce(
      {
        x: (forward.x * forwardAcceleration + right.x * lateralAcceleration) * mass,
        y: 0,
        z: (forward.z * forwardAcceleration + right.z * lateralAcceleration) * mass,
      },
      true,
    );

    const angularVelocity = this.robotBody.angvel().y;
    // calculateDifferentialWheelSpeeds already converts logical right (+1)
    // into physical negative yaw for this local -Z orientation.
    const yawTorque = clamp((wheelSpeeds.yawRate - angularVelocity) * 0.005, -0.035, 0.035);
    this.robotBody.addTorque({ x: 0, y: yawTorque, z: 0 }, true);
  }

  private readSnapshot(): PhysicsSnapshot {
    const translation = this.robotBody.translation();
    const rotation = this.robotBody.rotation();
    const velocity = this.robotBody.linvel();
    const objectTranslation = this.pushableObjectBody.translation();
    const objectRotation = this.pushableObjectBody.rotation();
    return {
      pose: {
        x: translation.x,
        y: translation.z,
        yaw: yawFromRotation(rotation),
      },
      verticalPosition: translation.y,
      speed: Math.hypot(velocity.x, velocity.z),
      yawRate: this.robotBody.angvel().y,
      pushableObject: {
        pose: {
          x: objectTranslation.x,
          y: objectTranslation.z,
          yaw: yawFromRotation(objectRotation),
        },
        verticalPosition: objectTranslation.y,
      },
    };
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('The Rapier simulation has already been disposed.');
    }
  }
}
