import { TSESTree } from '@typescript-eslint/types'
import { RegexOption } from '../types/common-options.js'
/**
 * Checks whether a node sits inside a function body that is deferred.
 *
 * Used to distinguish between references that are evaluated immediately (like
 * IIFEs or synchronous callbacks) and those whose execution is delayed (like
 * assigned functions or explicitly ignored callback wrappers).
 *
 * @param params - The parameters object.
 * @param params.ignoreCallbackDependenciesPatterns - Optional regex pattern to
 *   explicitly treat matching callback wrappers as deferred.
 * @param params.maxParent - Maximum exclusive parent node to stop the search
 *   at.
 * @param params.node - The AST node whose enclosing functions are inspected.
 * @returns Whether the node lives inside a deferred function.
 */
export declare function isNodeInsideDeferredFunction({
  ignoreCallbackDependenciesPatterns,
  maxParent,
  node,
}: {
  ignoreCallbackDependenciesPatterns: RegexOption
  maxParent: TSESTree.Node
  node: TSESTree.Node
}): boolean
