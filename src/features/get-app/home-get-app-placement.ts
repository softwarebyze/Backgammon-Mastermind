/**
 * Short landscape Home puts the Get-the-app pill in the brand row so it does
 * not push Start / Learn / Setup below the screen (#351). Portrait and taller
 * landscape keep it stacked under the logo and title.
 */
export function homeGetAppInlineInBrand(landscape: boolean, height: number): boolean {
  return landscape && height < 520;
}
