-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_checkInPhotoId_fkey" FOREIGN KEY ("checkInPhotoId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_checkOutPhotoId_fkey" FOREIGN KEY ("checkOutPhotoId") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
