import { TSESTree } from '@typescript-eslint/types'
import { SortModulesSortingNode } from '../types.js'
export type SortModulesSortingNodeWithoutDependencies = Omit<
  SortModulesSortingNode,
  'dependencies'
>
export declare function isIdentifierInDecoratorMetadataTypePosition({
  sortingNodes,
  identifier,
}: {
  sortingNodes: SortModulesSortingNodeWithoutDependencies[]
  identifier: TSESTree.JSXIdentifier | TSESTree.Identifier
}): boolean
