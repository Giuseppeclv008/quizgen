import type { QuestionViewProps } from "./QuestionView";

export function MultiSelectView({ question, answer, disabled, onAnswer }: QuestionViewProps) {
  if (question.type !== "multi_select") return null;
  const selected = answer?.type === "multi_select" ? answer.optionIds : [];
  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onAnswer({ type: "multi_select", optionIds: next });
  };
  return (
    <fieldset className="options">
      {question.options.map((o) => (
        <label key={o.id} className="option">
          <input
            type="checkbox"
            checked={selected.includes(o.id)}
            disabled={disabled}
            onChange={() => toggle(o.id)}
          />
          <span>{o.text}</span>
        </label>
      ))}
    </fieldset>
  );
}
