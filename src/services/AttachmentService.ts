import { supabase } from './SupabaseClient';

export interface StoredFile {
  id: string;
  ticketId: string;
  name: string;
  dataUrl: string; // Now holds the Supabase public URL instead of base64
}

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const match = arr[0].match(/:(.*?);/);
  const mime = match ? match[1] : '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) {
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type: mime});
}

export class AttachmentService {
  static async save(ticketId: string, files: { name: string; dataUrl: string }[]): Promise<void> {
    if (!files || files.length === 0) return;
    
    for (const f of files) {
      const blob = dataURLtoBlob(f.dataUrl);
      const filePath = `${ticketId}/${f.name}`;
      
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, blob, {
          upsert: true
        });
        
      if (error) {
        console.error('Error uploading attachment:', error);
      }
    }
  }

  static async load(ticketId: string): Promise<StoredFile[]> {
    const { data, error } = await supabase.storage
      .from('attachments')
      .list(ticketId);

    if (error || !data) {
      return [];
    }

    const results: StoredFile[] = [];
    
    for (const file of data) {
      // The Supabase list API returns an empty '.emptyFolderPlaceholder' if we're not careful, filter out metadata
      if (file.name === '.emptyFolderPlaceholder') continue;
      
      const filePath = `${ticketId}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      results.push({
        id: filePath,
        ticketId,
        name: file.name,
        dataUrl: urlData.publicUrl
      });
    }

    return results;
  }
}
