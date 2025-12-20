/**
 * BentoBoard - Three-Column Grid Layout
 * 
 * Landscape-first grid with:
 * - Column A (280px): Clinical story (Background, Social, Medications)
 * - Column B (flex): Measurements & Investigations (Labs, ECG, Echo, Cath, CT)
 * - Column C (320px): Procedural Plan "Command Card"
 */

import React from 'react';
import type { TAVIWorkupItem } from '@/types/taviWorkup.types';
import { BentoTile } from './BentoTile';
import { PlanCommandCard } from './PlanCommandCard';

interface BentoBoardProps {
  workup: TAVIWorkupItem;
  focusedIndex: number;
  expandedTiles: Set<number>;
  onTileClick: (index: number) => void;
  onToggleExpand: (index: number) => void;
  planPinned: boolean;
}

// Tile configurations with category colours
const TILE_CONFIGS = [
  // Column A - Clinical Story
  { key: 'background', title: 'Past History', column: 'A', accent: '#6B7280', icon: '📋' },
  { key: 'social_history', title: 'Social', column: 'A', accent: '#6B7280', icon: '👤' },
  { key: 'medications', title: 'Medications', column: 'A', accent: '#F59E0B', icon: '💊' },
  
  // Column B - Measurements & Investigations
  { key: 'laboratory', title: 'Labs', column: 'B', accent: '#8B5CF6', icon: '🧪' },
  { key: 'ecg', title: 'ECG', column: 'B', accent: '#EF4444', icon: '💓' },
  { key: 'echocardiography', title: 'Echocardiography', column: 'B', accent: '#EC4899', icon: '🫀' },
  { key: 'investigations', title: 'Cath Notes', column: 'B', accent: '#6366F1', icon: '🔬' },
  
  // Column C - Plan (handled separately)
  { key: 'procedure_planning', title: 'Procedure Plan', column: 'C', accent: '#10B981', icon: '📝' },
  
  // Alerts (spans or floats)
  { key: 'alerts', title: 'Alerts & Considerations', column: 'alerts', accent: '#F43F5E', icon: '⚠️' },
];

export const BentoBoard: React.FC<BentoBoardProps> = ({
  workup,
  focusedIndex,
  expandedTiles,
  onTileClick,
  onToggleExpand,
  planPinned
}) => {
  const sections = workup.structuredSections;

  // Get content for a section
  const getContent = (key: string): string => {
    const section = sections[key as keyof typeof sections];
    if (section && 'content' in section) {
      return section.content || '';
    }
    return '';
  };

  // Filter tiles by column
  const columnATiles = TILE_CONFIGS.filter(t => t.column === 'A');
  const columnBTiles = TILE_CONFIGS.filter(t => t.column === 'B');
  const alertTile = TILE_CONFIGS.find(t => t.column === 'alerts');

  // Get tile index in the full list
  const getTileIndex = (key: string): number => {
    return TILE_CONFIGS.findIndex(t => t.key === key);
  };

  return (
    <div className={`bento-board ${planPinned ? 'plan-pinned' : 'plan-hidden'}`}>
      {/* Column A - Clinical Story */}
      <div className="bento-column column-a">
        <div className="column-header">Clinical Story</div>
        {columnATiles.map(tile => {
          const index = getTileIndex(tile.key);
          return (
            <BentoTile
              key={tile.key}
              title={tile.title}
              content={getContent(tile.key)}
              accentColor={tile.accent}
              icon={tile.icon}
              isFocused={focusedIndex === index}
              isExpanded={expandedTiles.has(index)}
              onClick={() => onTileClick(index)}
              onToggleExpand={() => onToggleExpand(index)}
            />
          );
        })}
      </div>

      {/* Column B - Measurements & Investigations */}
      <div className="bento-column column-b">
        <div className="column-header">Measurements & Investigations</div>
        <div className="column-b-grid">
          {columnBTiles.map(tile => {
            const index = getTileIndex(tile.key);
            return (
              <BentoTile
                key={tile.key}
                title={tile.title}
                content={getContent(tile.key)}
                accentColor={tile.accent}
                icon={tile.icon}
                isFocused={focusedIndex === index}
                isExpanded={expandedTiles.has(index)}
                onClick={() => onTileClick(index)}
                onToggleExpand={() => onToggleExpand(index)}
              />
            );
          })}
        </div>
      </div>

      {/* Column C - Procedural Plan (Command Card) */}
      {planPinned && (
        <div className="bento-column column-c">
          <div className="column-header">Procedure Plan</div>
          <PlanCommandCard
            workup={workup}
            isFocused={focusedIndex === getTileIndex('procedure_planning')}
            isExpanded={expandedTiles.has(getTileIndex('procedure_planning'))}
            onClick={() => onTileClick(getTileIndex('procedure_planning'))}
            onToggleExpand={() => onToggleExpand(getTileIndex('procedure_planning'))}
          />
        </div>
      )}

      {/* Alerts Banner (if content exists) */}
      {alertTile && getContent('alerts') && getContent('alerts') !== 'Not provided' && (
        <div className="alerts-banner">
          <BentoTile
            title={alertTile.title}
            content={getContent('alerts')}
            accentColor={alertTile.accent}
            icon={alertTile.icon}
            isFocused={focusedIndex === getTileIndex('alerts')}
            isExpanded={expandedTiles.has(getTileIndex('alerts'))}
            onClick={() => onTileClick(getTileIndex('alerts'))}
            onToggleExpand={() => onToggleExpand(getTileIndex('alerts'))}
            isAlert
          />
        </div>
      )}
    </div>
  );
};
