import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_FILE_PATH = join(
  process.cwd(),
  "data",
  "campaigns.json"
);

async function readCampaignFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");

    if (!content.trim()) {
      return [];
    }

    const campaigns = JSON.parse(content);

    if (!Array.isArray(campaigns)) {
      throw new Error("Campaign store must contain an array");
    }

    return campaigns;
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeCampaignFile(filePath, campaigns) {
  await mkdir(dirname(filePath), {
    recursive: true,
  });

  await writeFile(
    filePath,
    JSON.stringify(campaigns, null, 2),
    "utf8"
  );
}

export function createCampaignStore({
  filePath = DEFAULT_FILE_PATH,
} = {}) {
  return {
    async save(campaignRecord) {
      if (!campaignRecord) {
        throw new Error("Campaign record is required");
      }

      const campaigns = await readCampaignFile(filePath);

      const now = new Date().toISOString();

      const storedCampaign = {
        id: campaignRecord.id || randomUUID(),
        ...campaignRecord,
        createdAt: campaignRecord.createdAt || now,
        updatedAt: now,
      };

      campaigns.unshift(storedCampaign);

      await writeCampaignFile(filePath, campaigns);

      return storedCampaign;
    },

    async list() {
      return readCampaignFile(filePath);
    },

    async getById(id) {
      const campaigns = await readCampaignFile(filePath);

      return (
        campaigns.find(
          (campaign) => campaign.id === id
        ) || null
      );
    },
  };
}

export const campaignStore = createCampaignStore();