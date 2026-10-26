import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const appState=sqliteTable('app_state',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});
