import type { FC } from "react";
import type { Question, QuestionType } from "../../domain/schema";
import type { Answer } from "../../domain/models";
import { SingleChoiceView } from "./SingleChoiceView";
import { MultiSelectView } from "./MultiSelectView";
import { TrueFalseView } from "./TrueFalseView";

export interface QuestionViewProps {
  question: Question;
  answer: Answer | undefined;
  disabled?: boolean;
  onAnswer: (answer: Answer) => void;
}

const viewRegistry: Record<QuestionType, FC<QuestionViewProps>> = {
  single_choice: SingleChoiceView,
  multi_select: MultiSelectView,
  true_false: TrueFalseView,
};

export function QuestionView(props: QuestionViewProps) {
  const View = viewRegistry[props.question.type];
  return (
    <div>
      <p>{props.question.prompt}</p>
      <View {...props} />
    </div>
  );
}
