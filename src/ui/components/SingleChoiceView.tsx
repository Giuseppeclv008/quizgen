import type { QuestionViewProps } from "./QuestionView";

export function SingleChoiceView({ question, answer, disabled, onAnswer }: QuestionViewProps) {
  if (question.type !== "single_choice") return null;
  const picked = answer?.type === "single_choice" ? answer.optionId : null;
  return (
    <fieldset>
      {question.options.map((o) => (
        <label key={o.id} style={{ display: "block" }}>
          <input
            type="radio"
            name={question.id}
            checked={picked === o.id}
            disabled={disabled}
            onChange={() => onAnswer({ type: "single_choice", optionId: o.id })}
          />
          {o.text}
        </label>
      ))}
    </fieldset>
  );
}
