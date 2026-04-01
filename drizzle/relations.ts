import { relations } from "drizzle-orm";
import {
  clients,
  estimates,
  fieldReports,
  finishSelections,
  ledgerEntries,
  materials,
  notifications,
  projects,
  scheduleItems,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  fieldReports: many(fieldReports),
  ledgerEntries: many(ledgerEntries),
  notifications: many(notifications),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  projects: many(projects),
  estimates: many(estimates),
  finishSelections: many(finishSelections),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  fieldReports: many(fieldReports),
  scheduleItems: many(scheduleItems),
  estimates: many(estimates),
  ledgerEntries: many(ledgerEntries),
  materials: many(materials),
  finishSelections: many(finishSelections),
  notifications: many(notifications),
}));

export const fieldReportsRelations = relations(fieldReports, ({ one }) => ({
  project: one(projects, {
    fields: [fieldReports.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [fieldReports.authorId],
    references: [users.id],
  }),
}));

export const scheduleItemsRelations = relations(scheduleItems, ({ one }) => ({
  project: one(projects, {
    fields: [scheduleItems.projectId],
    references: [projects.id],
  }),
}));

export const estimatesRelations = relations(estimates, ({ one }) => ({
  project: one(projects, {
    fields: [estimates.projectId],
    references: [projects.id],
  }),
  client: one(clients, {
    fields: [estimates.clientId],
    references: [clients.id],
  }),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  project: one(projects, {
    fields: [ledgerEntries.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [ledgerEntries.authorId],
    references: [users.id],
  }),
}));

export const materialsRelations = relations(materials, ({ one }) => ({
  project: one(projects, {
    fields: [materials.projectId],
    references: [projects.id],
  }),
}));

export const finishSelectionsRelations = relations(
  finishSelections,
  ({ one }) => ({
    project: one(projects, {
      fields: [finishSelections.projectId],
      references: [projects.id],
    }),
    client: one(clients, {
      fields: [finishSelections.clientId],
      references: [clients.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [notifications.projectId],
    references: [projects.id],
  }),
}));
