import { TSESTree } from '@typescript-eslint/types'
/**
 * Determines whether the node's source text ends with an expression.
 *
 * Automatic Semicolon Insertion only terminates an element at a line break when
 * the next token cannot continue it. An element whose text ends with an
 * expression can be continued, so a token such as `[`, `(` or `*` placed on the
 * following line is absorbed into that expression instead of starting a new
 * element.
 *
 * @example
 *
 * ```ts
 * // Ends with an expression: `[Symbol.iterator]` would be read as a member
 * // access on `[]` if it were moved onto the next line.
 * class Collection {
 *   items = []
 * }
 *
 * // Does not end with an expression: a type annotation cannot be continued.
 * class Collection {
 *   items: string[]
 * }
 * ```
 *
 * @param node - AST node to inspect.
 * @returns True if a following token could continue the node's text.
 */
export declare function doesNodeEndWithExpression(node: TSESTree.Node): boolean
