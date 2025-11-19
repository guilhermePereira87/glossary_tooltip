<?php

namespace Drupal\glossary_tooltip\Service;

interface GlossaryTooltipManagerInterface {

  /**
   * Build a map of terms for glossary IDs and language.
   *
   * Returns an associtative array of term text.
   *
   * @param string|null $langcode
   *  (optional) The language code to load terms for. If NULL, uses the current
   *  language.
   *
   * @return array
   *   Term map.
   */
  public function getGlossaryTermMap(?string $langcode = NULL): array;

  /**
   * Invalidate cache for a specific term id.
   *
   * @param int $tid
   *  The term ID.
   */
  public function invalidateTermCache(int $tid): void;
}
