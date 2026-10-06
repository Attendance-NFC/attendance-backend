import { TSESTree } from '@typescript-eslint/types'
/**
 * Determines whether a token continues the expression that precedes it.
 *
 * Such a token prevents Automatic Semicolon Insertion from terminating the
 * previous element at the line break: `[` starts a member access or a computed
 * key, `*` a multiplication or a generator, a backtick a tagged template, and
 * so on.
 *
 * @param token - Token that follows the element, if any.
 * @returns True if the token continues the preceding expression.
 */
export declare function isExpressionContinuationToken(
  token: TSESTree.Token | undefined | null,
): boolean
