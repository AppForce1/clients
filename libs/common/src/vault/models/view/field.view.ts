import { Jsonify } from "type-fest";

import { FieldType } from "../../../enums/fieldType";
import { LinkedIdType } from "../../../enums/linkedIdType";
import { View } from "../../../models/view/view";
import { Field } from "../domain/field";

export class FieldView implements View {
  name: string = null;
  value: string = null;
  type: FieldType = null;
  newField = false; // Marks if the field is new and hasn't been saved
  showValue = false;
  showCount = false;
  linkedId: LinkedIdType = null;

  constructor(f?: Field) {
    if (!f) {
      return;
    }

    this.type = f.type;
    this.linkedId = f.linkedId;
  }

  get maskedValue(): string {
    return this.value != null ? "••••••••" : null;
  }

  static fromJSON(obj: Partial<Jsonify<FieldView>>): FieldView {
    return Object.assign(new FieldView(), obj);
  }
}
