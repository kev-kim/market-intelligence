/**
 * Builds the in-memory dataset once (module singleton) by running the real
 * confidence engine over the seeds. Everything downstream reads from here.
 */
import { generate, type Dataset } from "./generate"
import { EXEMPLAR_SEEDS, WATCHLIST_SEEDS } from "./seeds"
import { EXTRA_SEEDS } from "./seeds-extra"

let _dataset: Dataset | null = null

export function getDataset(): Dataset {
  if (!_dataset) {
    _dataset = generate([...EXEMPLAR_SEEDS, ...EXTRA_SEEDS], WATCHLIST_SEEDS)
  }
  return _dataset
}

export type { Dataset } from "./generate"
export { SOURCES } from "./sources"
export { factLabel } from "./generate"
