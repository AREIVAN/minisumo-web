import { describe, expect, it } from 'vitest';
import { PRACTICE_RIVAL_TYPE } from '../../src/domain/index';
import { renderRivalSelector } from '../../src/ui/rival-selector';

describe('renderRivalSelector', () => {
  it('exposes both choices and marks the currently selected type accessibly', () => {
    const markup = renderRivalSelector(PRACTICE_RIVAL_TYPE.CYLINDER);

    expect(markup).toContain('aria-label="Elegir rival de práctica"');
    expect(markup).toContain('data-rival-type="minisumo" aria-pressed="false">Minisumo</button>');
    expect(markup).toContain('data-rival-type="cylinder" aria-pressed="true">Cilindro</button>');
  });

  it('keeps the choices visible but disables them during a round', () => {
    const markup = renderRivalSelector(PRACTICE_RIVAL_TYPE.CYLINDER, true);

    expect(markup).toContain('data-rival-type="minisumo" aria-pressed="false" disabled>Minisumo</button>');
    expect(markup).toContain('data-rival-type="cylinder" aria-pressed="true" disabled>Cilindro</button>');
  });
});
