import fs from "node:fs/promises";
import path from "node:path";

const CONNECTION_FILE = path.join(
  process.cwd(),
  "data",
  "meta-connection.json"
);

export async function saveMetaConnection(connection) {
  await fs.mkdir(path.dirname(CONNECTION_FILE), {
    recursive: true,
  });

  await fs.writeFile(
    CONNECTION_FILE,
    JSON.stringify(connection, null, 2),
    "utf8"
  );
}

export async function loadMetaConnection() {
  try {
    const content = await fs.readFile(
      CONNECTION_FILE,
      "utf8"
    );

    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function deleteMetaConnection() {
  try {
    await fs.unlink(CONNECTION_FILE);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}