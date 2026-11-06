/**
 * Whether the lesson board draws its point-number rails. It must match
 * BoardView's own rule (a step's aids win, else the player's preference),
 * or the screen sizes the board without the rails it then draws.
 */
export function lessonShowsPointNumbers(aids: { showPointNumbers?: boolean } | undefined, preference: boolean): boolean {
  return aids?.showPointNumbers ?? preference;
}
