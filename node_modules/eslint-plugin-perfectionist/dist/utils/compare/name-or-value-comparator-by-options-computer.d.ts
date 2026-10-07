import {
  ComparatorByOptionsComputer,
  defaultComparatorByOptionsComputer,
} from './default-comparator-by-options-computer.js'
import { SortingNode } from '../../types/sorting-node.js'
type Options = Parameters<typeof defaultComparatorByOptionsComputer>[0] & {
  sortBy: 'value' | 'name'
}
interface SortingNodeWithValue extends SortingNode {
  value: string
}
/**
 * Computes a comparator that compares sorting nodes either by name or by value,
 * depending on the `sortBy` option.
 *
 * @param options - Sorting options.
 * @returns A comparator for sorting nodes.
 */
export declare let nameOrValueComparatorByOptionsComputer: ComparatorByOptionsComputer<
  Options,
  SortingNodeWithValue
>
export {}
