import { CommonOptions, TypeOption } from '../../types/common-options.js'
import { GroupsOptions } from '../../types/common-groups-options.js'
import { SortingNode } from '../../types/sorting-node.js'
export type ComparatorByOptionsComputer<S, T extends SortingNode> = (
  options: S,
) => Comparator<T>
export type Comparator<T extends SortingNode> = (a: T, b: T) => number
type Options = Pick<
  CommonOptions<TypeOption>,
  'specialCharacters' | 'ignoreCase' | 'alphabet' | 'locales' | 'order' | 'type'
> &
  Pick<CommonOptions, 'fallbackSort'> & {
    groups?: GroupsOptions
  }
/**
 * Builds a comparator computer that compares sorting nodes by a string computed
 * from each node, according to the sort type of the options.
 *
 * Sort types that do not compare strings, such as line length or subgroup
 * order, ignore the computed string.
 *
 * @param computeValue - Computes the string to compare for a sorting node.
 * @returns A function that computes a comparator from sorting options.
 */
export declare function buildStringComparatorByOptionsComputer<
  T extends SortingNode,
>(computeValue: (node: T) => string): ComparatorByOptionsComputer<Options, T>
export declare let defaultComparatorByOptionsComputer: ComparatorByOptionsComputer<
  Options,
  SortingNode
>
export {}
