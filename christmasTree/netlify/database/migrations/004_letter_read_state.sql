ALTER TABLE gifts ADD COLUMN letter_version integer NOT NULL DEFAULT 1;
ALTER TABLE gifts ADD COLUMN letter_read_version integer NOT NULL DEFAULT 0;
-- Do not announce the pre-existing mailbox as newly arrived mail on rollout.
UPDATE gifts SET letter_read_version = letter_version;
