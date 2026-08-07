/**
 * The Tailwind classes that make a block of exam material read like printed paper: the
 * Aufgabe and the Brief/Anzeige it responds to should be there to be worked from, not
 * lifted out of the page in one drag.
 *
 * `user-select` is inherited, so this belongs on the wrapper of a block rather than on
 * each paragraph inside it, and it takes the subtree out of Select-All too. The webkit
 * callout closes the iOS long-press "Copy" that `user-select` alone leaves open.
 *
 * What it is not: this is friction, not a lock. The text is still in the HTML payload and
 * in the prompts API response, so devtools or view-source still reach it. Keeping prompt
 * content off the wire entirely would be a server-side change, not a class name.
 */
export const NOT_COPYABLE = "select-none [-webkit-touch-callout:none]";
