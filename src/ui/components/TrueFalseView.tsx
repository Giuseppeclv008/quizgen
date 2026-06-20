import type { QuestionViewProps } from "./QuestionView";

export function TrueFalseView({ question, answer, disabled, onAnswer }: QuestionViewProps) {
  if (question.type !== "true_false") return null;
  const value = answer?.type === "true_false" ? answer.value : null;
  return (
    <fieldset>
      {[{ label: "True", v: true }, { label: "False", v: false }].map(({ label, v }) => (
        <label key={label} style={{ display: "block" }}>
          <input
            type="radio"
            name={question.id}
            checked={value === v}
            disabled={disabled}
            onChange={() => onAnswer({ type: "true_false", value: v })}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
