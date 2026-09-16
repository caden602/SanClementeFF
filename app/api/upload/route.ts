import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const videoTypes = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/3gpp",
  "video/3gpp2",
  "video/mpeg",
  "video/x-msvideo",
];

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("apologies/")) throw new Error("Invalid upload path.");

        return {
          allowedContentTypes: videoTypes,
          maximumSizeInBytes: 750 * 1024 * 1024,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ uploadedFrom: "apology-tape" }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return Response.json(response);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
