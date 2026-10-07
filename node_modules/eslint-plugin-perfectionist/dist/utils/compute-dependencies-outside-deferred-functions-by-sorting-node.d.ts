import { TSESTree } from '@typescript-eslint/types'
import { TSESLint } from '@typescript-eslint/utils'
import { SortingNodeWithDependencies } from './sort-nodes-by-dependencies.js'
import { RegexOption } from '../types/common-options.js'
export declare function computeDependenciesOutsideDeferredFunctionsBySortingNode<
  Node extends TSESTree.Node,
  T extends Pick<SortingNodeWithDependencies<Node>, 'dependencyNames' | 'node'>,
>({
  ignoreCallbackDependenciesPatterns,
  sortingNodes,
  sourceCode,
}: {
  ignoreCallbackDependenciesPatterns: RegexOption
  sourceCode: TSESLint.SourceCode
  sortingNodes: T[]
}): Map<T, T[]>
