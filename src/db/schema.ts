import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { ROLES, type Role } from "@/domain/roles";

export const roleEnum = pgEnum("role", ROLES);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "submitted", "expired"]);

export type { Role };
export type AttemptStatus = (typeof attemptStatusEnum.enumValues)[number];

const utc = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    fullName: text("full_name").notNull(),
    fullNameLatin: text("full_name_latin"),
    classId: integer("class_id").references(() => classes.id),
  },
  (t) => [index("users_class_id_idx").on(t.classId)],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: serial("id").primaryKey(),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    timeLimitMinutes: integer("time_limit_minutes").notNull(),
    opensAt: utc("opens_at").notNull(),
    closesAt: utc("closes_at").notNull(),
    penaltyPercent: integer("penalty_percent").notNull().default(0),
    createdAt: utc("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("quizzes_teacher_id_idx").on(t.teacherId),
    check("quizzes_penalty_range", sql`${t.penaltyPercent} between 0 and 100`),
    check("quizzes_time_limit_positive", sql`${t.timeLimitMinutes} > 0`),
    check("quizzes_window_order", sql`${t.closesAt} > ${t.opensAt}`),
  ],
);

export const quizClasses = pgTable(
  "quiz_classes",
  {
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id),
  },
  (t) => [primaryKey({ columns: [t.quizId, t.classId] }), index("quiz_classes_class_id_idx").on(t.classId)],
);

export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    points: integer("points").notNull(),
  },
  (t) => [unique("questions_quiz_position_uq").on(t.quizId, t.position), check("questions_points_positive", sql`${t.points} > 0`)],
);

export const options = pgTable(
  "options",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull(),
  },
  (t) => [unique("options_question_position_uq").on(t.questionId, t.position)],
);

export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => users.id),
    quizId: integer("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    startedAt: utc("started_at").notNull(),
    deadline: utc("deadline").notNull(),
    finishedAt: utc("finished_at"),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    scoreCenti: integer("score_centi"),
    correctCount: integer("correct_count"),
    wrongCount: integer("wrong_count"),
    blankCount: integer("blank_count"),
  },
  (t) => [unique("attempts_student_quiz_uq").on(t.studentId, t.quizId), index("attempts_quiz_id_idx").on(t.quizId)],
);

export const answers = pgTable(
  "answers",
  {
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    optionId: integer("option_id").references(() => options.id, { onDelete: "cascade" }),
    answeredAt: utc("answered_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);
