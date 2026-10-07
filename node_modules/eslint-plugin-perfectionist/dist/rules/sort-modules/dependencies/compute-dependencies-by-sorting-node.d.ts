import { TSESLint } from '@typescript-eslint/utils'
import { SortModulesSortingNodeWithoutDependencies } from './is-identifier-in-decorator-metadata-type-position.js'
type HardDependencyDetectionParameters = {
  emitDecoratorMetadata: boolean
  dependencyDetection: 'hard'
} & CommonParameters
type SoftDependencyDetectionParameters = {
  emitDecoratorMetadata?: never
  dependencyDetection: 'soft'
} & CommonParameters
interface CommonParameters {
  sortingNodes: SortModulesSortingNodeWithoutDependencies[]
  sourceCode: TSESLint.SourceCode
}
type Parameters =
  SoftDependencyDetectionParameters | HardDependencyDetectionParameters
export declare function computeDependenciesBySortingNode({
  emitDecoratorMetadata,
  dependencyDetection,
  sortingNodes,
  sourceCode,
}: Parameters): Map<
  SortModulesSortingNodeWithoutDependencies,
  SortModulesSortingNodeWithoutDependencies[]
>
export {}
