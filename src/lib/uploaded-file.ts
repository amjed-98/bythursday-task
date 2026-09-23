import { DomainError } from "@/domain/errors";
import { parseSpreadsheet, type RawRow } from "@/domain/import/parse-file";

export async function readUploadedSpreadsheet(formData: FormData, field = "file"): Promise<RawRow[]> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) throw new DomainError("VALIDATION", "Choose a file to upload");
  return parseSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
}
