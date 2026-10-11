/**
 * Hands a file to the user. On phones the share sheet ("Bewaar in Bestanden", "Agenda") is more
 * reliable than a download, especially in an installed iOS app. Returns false when cancelled.
 */
export async function saveFile(file: File, title: string): Promise<boolean> {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
