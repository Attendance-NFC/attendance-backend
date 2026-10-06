import { RegexOption } from '../../types/common-options.js'
/**
 * Checks if a context option applies to a node, based on the conditions of its
 * `useConfigurationIf` option.
 *
 * Only handles the `allNamesMatchPattern` and `matchesAstSelector` conditions,
 * which are shared by all rules. Rules supporting additional conditions check
 * them on their own.
 *
 * @param params - The parameters object.
 * @param params.matchedAstSelectors - The matched AST selectors for the node.
 * @param params.nodeNames - Names of the node elements to sort.
 * @param params.options - The context option to check.
 * @returns True if the context option has no `useConfigurationIf` or all of its
 *   conditions are met; otherwise, false.
 */
export declare function isContextOptionMatching({
  matchedAstSelectors,
  nodeNames,
  options,
}: {
  options: {
    useConfigurationIf?: {
      allNamesMatchPattern?: RegexOption
      matchesAstSelector?: string
    }
  }
  matchedAstSelectors: ReadonlySet<string>
  nodeNames: string[]
}): boolean
