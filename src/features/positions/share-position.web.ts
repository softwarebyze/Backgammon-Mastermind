export async function sharePosition(url: string): Promise<void> {
  if (navigator.share) {
    await navigator.share({ url });
    return;
  }
  await navigator.clipboard.writeText(url);
}
