import { useState, type FormEvent } from 'react';
import { Sheet } from '../../core/components/Sheet';
import { plainInput } from '../../core/lib/util';
import { useAppState } from '../../core/store';
import { MAX_NAME_LENGTH } from '../../core/types';
import { LABEL_COLORS } from '../lists/types';
import { createHabit, updateHabit } from './store';
import { MAX_AMOUNT, WEEKDAYS, type Habit, type HabitGoal } from './types';

type GoalKind = HabitGoal['kind'];

/** Create or edit a habit: name, colour, goal (days or times per week), optional daily amount. */
export function HabitSheet({
  habit,
  onClose,
  onCreated,
}: {
  habit?: Habit;
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const { data } = useAppState();
  const [name, setName] = useState(habit?.name ?? '');
  const [color, setColor] = useState(
    habit?.color ?? LABEL_COLORS[data.habits.length % LABEL_COLORS.length],
  );
  const [kind, setKind] = useState<GoalKind>(habit?.goal.kind ?? 'daily');
  const [days, setDays] = useState<number[]>(
    habit?.goal.kind === 'weekdays' ? habit.goal.days : [0, 1, 2, 3, 4],
  );
  const [times, setTimes] = useState(habit?.goal.kind === 'perWeek' ? habit.goal.times : 3);
  const [withAmount, setWithAmount] = useState(!!habit?.target);
  const [amount, setAmount] = useState(String(habit?.target?.amount ?? 8));
  const [unit, setUnit] = useState(habit?.target?.unit ?? '');

  const amountValue = Number(amount);
  const valid =
    name.trim().length > 0 &&
    (kind !== 'weekdays' || days.length > 0) &&
    (!withAmount ||
      (Number.isInteger(amountValue) && amountValue >= 1 && amountValue <= MAX_AMOUNT));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const goal: HabitGoal =
      kind === 'daily' ? { kind } : kind === 'weekdays' ? { kind, days } : { kind, times };
    const fields = { name, color, goal, target: withAmount ? { amount: amountValue, unit } : null };
    if (habit) updateHabit(habit.id, fields);
    else {
      const id = createHabit(fields);
      if (id) onCreated?.(id);
    }
    onClose();
  };

  return (
    <Sheet title={habit ? 'Gewoonte bewerken' : 'Nieuwe gewoonte'} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Naam</span>
          <input
            type="text"
            value={name}
            placeholder="Bijv. Lezen, Water drinken, Sporten"
            maxLength={MAX_NAME_LENGTH}
            autoFocus={!habit}
            {...plainInput}
            enterKeyHint="done"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="field">
          <span id="habit-color">Kleur</span>
          <div className="color-row" role="radiogroup" aria-labelledby="habit-color">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Kleur ${c}`}
                className={`color-swatch${color === c ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span id="habit-goal">Doel</span>
          <div className="segmented" role="radiogroup" aria-labelledby="habit-goal">
            {(
              [
                ['daily', 'Elke dag'],
                ['weekdays', 'Vaste dagen'],
                ['perWeek', 'Per week'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={kind === value}
                className={kind === value ? 'active' : ''}
                onClick={() => setKind(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {kind === 'weekdays' && (
            <div className="weekday-row" role="group" aria-label="Dagen">
              {WEEKDAYS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={days.includes(index)}
                  className={`weekday${days.includes(index) ? ' active' : ''}`}
                  onClick={() =>
                    setDays((current) =>
                      current.includes(index)
                        ? current.filter((d) => d !== index)
                        : [...current, index].sort(),
                    )
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {kind === 'perWeek' && (
            <div className="stepper" role="group" aria-label="Keer per week">
              <button
                type="button"
                className="btn btn-square"
                aria-label="Eén minder"
                disabled={times <= 1}
                onClick={() => setTimes(times - 1)}
              >
                −
              </button>
              <output className="stepper-value" aria-live="polite">
                {times}× per week
              </output>
              <button
                type="button"
                className="btn btn-square"
                aria-label="Eén meer"
                disabled={times >= 7}
                onClick={() => setTimes(times + 1)}
              >
                +
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label className="inline-check">
            <input
              type="checkbox"
              checked={withAmount}
              onChange={(event) => setWithAmount(event.target.checked)}
            />
            Met een hoeveelheid per dag
          </label>
          {withAmount && (
            <div className="date-row">
              <input
                type="number"
                inputMode="numeric"
                className="date-input amount-input"
                aria-label="Hoeveelheid"
                min={1}
                max={MAX_AMOUNT}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              <input
                type="text"
                aria-label="Eenheid"
                placeholder="glazen, minuten, km…"
                maxLength={30}
                value={unit}
                {...plainInput}
                onChange={(event) => setUnit(event.target.value)}
              />
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>
          {habit ? 'Opslaan' : 'Gewoonte maken'}
        </button>
      </form>
    </Sheet>
  );
}
