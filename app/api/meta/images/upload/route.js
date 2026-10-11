import { loadMetaConnection } from "../../../../../src/application/meta-connection-store.mjs";
import { uploadMetaAdImage } from "../../../../../src/connectors/meta/image-upload.mjs";

export async function POST(request) {
  try {
    const connection = await loadMetaConnection();

    if (!connection?.accessToken) {
      return Response.json(
        {
          status: "NOT_CONNECTED",
          error: "Meta is not connected",
        },
        {
          status: 401,
        }
      );
    }

    const adAccountId = connection.setup?.adAccount?.id;

    if (!adAccountId) {
      return Response.json(
        {
          status: "NEEDS_SETUP",
          error: "Meta ad account is not configured",
        },
        {
          status: 400,
        }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!image || typeof image === "string") {
      return Response.json(
        {
          status: "ERROR",
          error: "An image file is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      image.type &&
      !String(image.type).toLowerCase().startsWith("image/")
    ) {
      return Response.json(
        {
          status: "ERROR",
          error: "Uploaded file must be an image",
        },
        {
          status: 400,
        }
      );
    }

    const uploaded = await uploadMetaAdImage({
      adAccountId,
      accessToken: connection.accessToken,
      file: image,
    });

    return Response.json({
      status: "UPLOADED",
      imageHash: uploaded.hash,
      imageUrl: uploaded.url,
      fileName: image.name || null,
    });
  } catch (error) {
    console.error("Meta image upload error:", error);

    return Response.json(
      {
        status: "ERROR",
        error: error.message || "Could not upload image to Meta",
      },
      {
        status: 500,
      }
    );
  }
}
