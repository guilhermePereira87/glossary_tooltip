<?php

namespace Drupal\glossary_tooltip\Service;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Language\LanguageManagerInterface;

class GlossaryTooltipManager implements GlossaryTooltipManagerInterface {

  /**
   * The Entity Type Manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The Cache Backend service.
   *
   * @var \Drupal\Core\Cache\CacheBackendInterface
   */
  protected $cache;

  /**
   * The Language Manager service.
   *
   * @var \Drupal\Core\Language\LanguageManagerInterface
   */
  protected $languageManager;

  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
    CacheBackendInterface $cache,
    LanguageManagerInterface $language_manager) {
    $this->entityTypeManager = $entity_type_manager;
    $this->cache = $cache;
    $this->languageManager = $language_manager;
  }

  /**
   * {@inheritdoc}
   */
  public function getGlossaryTermMap(?string $langcode = NULL): array {
    $vocabulary = 'glossary';
    // Use current language if none specified.
    $langcode = $langcode ?? $this->languageManager->getCurrentLanguage()->getId();

    //Build cache based on language.
    $cacheId = 'glossary_tooltip_term_map:' . md5($langcode);

    if ($cache = $this->cache->get($cacheId)) {
      return $cache->data;
    }

    // Load glossary terms.
    $term_storage = $this->entityTypeManager->getStorage('taxonomy_term');
    $query = $term_storage->getQuery()
      ->condition('vid', $vocabulary)
      ->accessCheck(FALSE);
    $termIds = $query->execute();

    if (empty($termIds)) {
      $this->cache->set($cacheId, [], CacheBackendInterface::CACHE_PERMANENT, []);
      return [];
    }

    $terms = $term_storage->loadMultiple($termIds);

    $map = [];
    foreach ($terms as $term) {
      // Get translated term if available.
      $translatedTerm = $term->hasTranslation($langcode) ? $term->getTranslation($langcode) : $term;
      $label = (string) $translatedTerm->label();
      if ($label === '') {
        continue;
      }

      $key = mb_strtolower(trim($label));

      // Get the description field value raw.
      $description = '';
      if ($translatedTerm->hasField('description') && !$translatedTerm->get('description')->isEmpty()) {
        $description = $translatedTerm->get('description')->value;
      }

      $map[$key] = [
        'tid' => $term->id(),
        'label' => $label,
        'description' => $description,
      ];
    }

      //Build cache tags for invalidation when glossary terms are updated.
      $tags = [];
      foreach ($map as $entry) {
        $tags[] = 'taxonomy_term:' . $entry['tid']; 
      }

      $this->cache->set($cacheId, $map, CacheBackendInterface::CACHE_PERMANENT, $tags);

      return $map;
  }

  /**
   * {@inheritdoc}
   */
  public function invalidateTermCache(int $tid): void {
    // Invalidate all caches tagged with the specific term ID.
    $this->cache->invalidateTags(['taxonomy_term:' . $tid]);
  }

}