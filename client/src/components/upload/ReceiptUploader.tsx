import { useState } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReceiptUploaderProps {
  onUploadComplete?: (receiptUrl: string) => void;
  currentReceiptUrl?: string;
  onRemoveReceipt?: () => void;
  disabled?: boolean;
}

export function ReceiptUploader({ 
  onUploadComplete, 
  currentReceiptUrl, 
  onRemoveReceipt,
  disabled = false 
}: ReceiptUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          try {
            const response = await apiRequest('/api/receipts/upload', 'POST') as any;
            return {
              method: 'PUT' as const,
              url: response.uploadURL,
            };
          } catch (error) {
            console.error('Error getting upload URL:', error);
            throw error;
          }
        },
      })
      .on('upload', () => {
        setIsUploading(true);
      })
      .on('complete', (result) => {
        setIsUploading(false);
        setShowModal(false);
        
        if (result.successful && result.successful.length > 0) {
          const uploadedFile = result.successful[0];
          if (uploadedFile.uploadURL && onUploadComplete) {
            // Normalize the upload URL to our internal format
            const receiptUrl = normalizeReceiptUrl(uploadedFile.uploadURL);
            onUploadComplete(receiptUrl);
          }
        }
      })
      .on('error', (error) => {
        setIsUploading(false);
        console.error('Upload error:', error);
      })
  );

  const normalizeReceiptUrl = (uploadUrl: string): string => {
    // Convert the upload URL to our internal receipt serving format
    // This will be handled by the backend object storage service
    if (uploadUrl.includes('storage.googleapis.com')) {
      const url = new URL(uploadUrl);
      const pathParts = url.pathname.split('/');
      if (pathParts.length >= 3) {
        const bucketName = pathParts[1];
        const objectPath = pathParts.slice(2).join('/');
        return `/receipts/${objectPath}`;
      }
    }
    return uploadUrl;
  };

  const getFileExtension = (url: string): string => {
    const parts = url.split('.');
    return parts[parts.length - 1]?.toLowerCase() || '';
  };

  const isPdf = (url: string): boolean => {
    return getFileExtension(url) === 'pdf';
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Ricevuta (PDF o JPEG)</label>
      
      {currentReceiptUrl ? (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="text-sm flex-1">
            {isPdf(currentReceiptUrl) ? 'Ricevuta PDF caricata' : 'Ricevuta immagine caricata'}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(currentReceiptUrl, '_blank')}
          >
            Visualizza
          </Button>
          {onRemoveReceipt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemoveReceipt}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowModal(true)}
          disabled={disabled || isUploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Caricamento...' : 'Carica ricevuta'}
        </Button>
      )}

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}