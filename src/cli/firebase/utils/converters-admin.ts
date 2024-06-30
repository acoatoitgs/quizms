import { DocumentSnapshot, FirestoreDataConverter, Timestamp } from "firebase-admin/firestore";
import { cloneDeepWith, isDate, isString, mapValues, omit } from "lodash-es";
import z, {
  ZodArray,
  ZodDate,
  ZodDefault,
  ZodDiscriminatedUnion,
  ZodObject,
  ZodOptional,
  ZodRecord,
  ZodType,
  ZodTypeAny,
  ZodUnion,
} from "zod";

import {
  contestSchema,
  participationMappingSchema,
  participationSchema,
  studentSchema,
  submissionSchema,
  variantMappingSchema,
  variantSchema,
} from "~/models";
import validate from "~/utils/validate";

function convertToFirestore(data: Record<string, any>) {
  return cloneDeepWith(omit(data, "id"), (value) => {
    if (isDate(value)) {
      return Timestamp.fromDate(value);
    }
    if (isString(value)) {
      return value.trim();
    }
    if (value === undefined) {
      return null;
    }
  });
}

function toFirebaseSchema(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof ZodDate) {
    return z
      .instanceof(Timestamp)
      .transform((ts) => ts.toDate())
      .pipe(schema);
  }
  if (schema instanceof ZodObject) {
    return z.object(mapValues(schema.shape, (field) => toFirebaseSchema(field)));
  }
  if (schema instanceof ZodRecord) {
    return z.record(toFirebaseSchema(schema.element));
  }
  if (schema instanceof ZodArray) {
    return toFirebaseSchema(schema.element).array();
  }
  if (schema instanceof ZodOptional) {
    return z.preprocess((val) => val ?? undefined, toFirebaseSchema(schema.unwrap()).optional());
  }
  if (schema instanceof ZodDefault) {
    return toFirebaseSchema(schema.removeDefault()).pipe(schema);
  }
  if (schema instanceof ZodUnion) {
    return z.union(schema.options.map((option: ZodTypeAny) => toFirebaseSchema(option)));
  }
  if (schema instanceof ZodDiscriminatedUnion) {
    return z.discriminatedUnion(
      schema.discriminator,
      schema.options.map((option: ZodTypeAny) => toFirebaseSchema(option)),
    );
  }
  return schema;
}

function parse<T>(schema: ZodType<T, any, any>, snapshot: DocumentSnapshot): T {
  const data = { ...snapshot.data(), id: snapshot.id };
  return validate(toFirebaseSchema(schema), data);
}

function converter<T extends object>(schema: ZodType<T, any, any>): FirestoreDataConverter<T> {
  return {
    toFirestore: (data) => convertToFirestore(data),
    fromFirestore: (snapshot) => parse(schema, snapshot),
  };
}

export const contestConverter = converter(contestSchema);
export const participationConverter = converter(participationSchema);
export const participationMappingConverter = converter(participationMappingSchema);
export const studentConverter = converter(studentSchema);
export const submissionConverter = converter(submissionSchema);
export const variantConverter = converter(variantSchema);
export const variantMappingConverter = converter(variantMappingSchema);
