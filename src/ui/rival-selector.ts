import { PRACTICE_RIVAL_TYPE, type PracticeRivalType } from '../domain/index';

export function renderRivalSelector(rivalType: PracticeRivalType, disabled = false): string {
  const disabledAttribute = disabled ? ' disabled' : '';
  return `
    <div class="rival-selector" role="group" aria-label="Elegir rival de práctica">
      <span class="rival-selector-label">RIVAL</span>
      <button type="button" data-rival-type="${PRACTICE_RIVAL_TYPE.MINISUMO}" aria-pressed="${rivalType === PRACTICE_RIVAL_TYPE.MINISUMO}"${disabledAttribute}>Minisumo</button>
      <button type="button" data-rival-type="${PRACTICE_RIVAL_TYPE.CYLINDER}" aria-pressed="${rivalType === PRACTICE_RIVAL_TYPE.CYLINDER}"${disabledAttribute}>Cilindro</button>
    </div>
  `;
}
