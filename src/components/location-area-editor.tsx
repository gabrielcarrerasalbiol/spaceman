'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Layer,
  Rect,
  Stage,
  Text,
  Image as KonvaImage,
  Transformer,
} from 'react-konva';
import useImage from 'use-image';
import { ImagePlus, Plus, Save, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUnitDisplayName, formatUnitSizeLabel } from '@/lib/unit-display';

type UnitItem = {
  id: string;
  code: string;
  unitNumber: number | null;
  name: string | null;
  sizeSqft: number | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
};

type Placement = {
  id: string;
  unitId: string;
  shape: 'RECTANGLE' | 'POLYGON';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  label: string | null;
};

type Area = {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  backgroundImageUrl: string | null;
  canvasWidth: number;
  canvasHeight: number;
  sortOrder: number;
  active: boolean;
  placements?: Array<Placement & { unit: UnitItem }>;
};

function statusFill(status: UnitItem['status']) {
  if (status === 'AVAILABLE') return '#22c55e';
  if (status === 'RESERVED') return '#f59e0b';
  if (status === 'OCCUPIED') return '#3b82f6';
  if (status === 'MAINTENANCE') return '#ef4444';
  return '#6b7280';
}

function createPlacement(unitId: string, index: number, x = 100, y = 100): Placement {
  return {
    id: `${unitId}-${Date.now()}-${index}`,
    unitId,
    shape: 'RECTANGLE',
    x,
    y,
    width: 110,
    height: 50,
    rotation: 0,
    zIndex: index,
    label: null,
  };
}

export default function LocationAreaEditor({ locationId }: { locationId: string }) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('ALL');

  const [areaMeta, setAreaMeta] = useState({
    name: '',
    description: '',
    backgroundImageUrl: '',
    canvasWidth: 1400,
    canvasHeight: 820,
    active: true,
  });

  const [placements, setPlacements] = useState<Placement[]>([]);

  const [backgroundImage] = useImage(areaMeta.backgroundImageUrl || '');
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement | null>(null);

  const placementByUnitId = useMemo(() => {
    return new Set(placements.map((placement) => placement.unitId));
  }, [placements]);

  const selectedArea = useMemo(() => {
    return areas.find((area) => area.id === selectedAreaId) || null;
  }, [areas, selectedAreaId]);

  const placementMap = useMemo(() => {
    const map = new Map<string, Placement>();
    for (const placement of placements) {
      map.set(placement.id, placement);
    }
    return map;
  }, [placements]);

  const unitMap = useMemo(() => {
    const map = new Map<string, UnitItem>();
    for (const unit of units) {
      map.set(unit.id, unit);
    }
    return map;
  }, [units]);

  const groupedUnits = useMemo(() => {
    const groups = new Map<string, UnitItem[]>();
    for (const unit of units) {
      const groupKey = formatUnitSizeLabel(unit.sizeSqft);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(unit);
    }

    return [...groups.entries()]
      .sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true }))
      .map(([label, items]) => ({
        label,
        sizeSqft: items[0]?.sizeSqft ?? null,
        items: [...items].sort((left, right) => {
          const leftNumber = left.unitNumber ?? Number.MAX_SAFE_INTEGER;
          const rightNumber = right.unitNumber ?? Number.MAX_SAFE_INTEGER;
          if (leftNumber !== rightNumber) return leftNumber - rightNumber;
          return left.code.localeCompare(right.code);
        }),
      }));
  }, [units]);

  const sizeOptions = useMemo(() => {
    return [...new Set(units.map((unit) => unit.sizeSqft).filter((value) => value !== null))]
      .sort((left, right) => Number(left) - Number(right));
  }, [units]);

  const filteredGroupedUnits = useMemo(() => {
    const normalizedQuery = unitSearch.trim().toLowerCase();
    return groupedUnits
      .filter((group) => (sizeFilter === 'ALL' ? true : String(group.sizeSqft ?? '') === sizeFilter))
      .map((group) => ({
        ...group,
        items: group.items.filter((unit) => {
          if (!normalizedQuery) return true;
          const displayName = formatUnitDisplayName(unit).toLowerCase();
          return displayName.includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groupedUnits, sizeFilter, unitSearch]);

  const placedUnits = useMemo(() => {
    return placements
      .map((placement) => ({
        placementId: placement.id,
        unit: unitMap.get(placement.unitId),
      }))
      .filter((entry): entry is { placementId: string; unit: UnitItem } => Boolean(entry.unit));
  }, [placements, unitMap]);

  useEffect(() => {
    bootstrap();
  }, [locationId]);

  useEffect(() => {
    if (!selectedPlacementId || !transformerRef.current || !stageRef.current) {
      return;
    }

    const selectedNode = stageRef.current.findOne(`#shape-${selectedPlacementId}`);
    if (!selectedNode) {
      transformerRef.current.nodes([]);
      return;
    }

    transformerRef.current.nodes([selectedNode]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedPlacementId, placements]);

  async function bootstrap() {
    setLoading(true);
    setError(null);

    try {
      const [areasRes, unitsRes] = await Promise.all([
        fetch(`/api/locations/${locationId}/areas`),
        fetch(`/api/units?locationId=${encodeURIComponent(locationId)}`),
      ]);

      if (!areasRes.ok || !unitsRes.ok) {
        setError('Failed to load map data');
        return;
      }

      const [areasData, unitsData] = await Promise.all([areasRes.json(), unitsRes.json()]);
      setAreas(areasData);
      setUnits(unitsData);

      if (areasData.length > 0) {
        selectArea(areasData[0]);
      }
    } catch (e) {
      setError('Failed to load area editor data');
    } finally {
      setLoading(false);
    }
  }

  function selectArea(area: Area) {
    setSelectedAreaId(area.id);
    setAreaMeta({
      name: area.name,
      description: area.description || '',
      backgroundImageUrl: area.backgroundImageUrl || '',
      canvasWidth: area.canvasWidth,
      canvasHeight: area.canvasHeight,
      active: area.active,
    });
    setPlacements((area.placements || []).map((placement) => ({
      id: placement.id,
      unitId: placement.unitId,
      shape: placement.shape,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
      zIndex: placement.zIndex,
      label: placement.label,
    })));
    setSelectedPlacementId(null);
    setUnitSearch('');
    setSizeFilter('ALL');
  }

  async function handleCreateArea() {
    const name = newAreaName.trim();
    if (!name) return;

    try {
      const response = await fetch(`/api/locations/${locationId}/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        setError('Failed to create area');
        return;
      }

      const created = await response.json();
      const nextAreas = [...areas, { ...created, placements: [] }].sort((a, b) => a.sortOrder - b.sortOrder);
      setAreas(nextAreas);
      setNewAreaName('');
      selectArea({ ...created, placements: [] });
      setMode('edit');
    } catch (e) {
      setError('Failed to create area');
    }
  }

  async function handleDeleteArea() {
    if (!selectedArea) return;

    const proceed = window.confirm(`Delete area ${selectedArea.name}?`);
    if (!proceed) return;

    const response = await fetch(`/api/locations/${locationId}/areas/${selectedArea.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      setError('Failed to delete area');
      return;
    }

    const remaining = areas.filter((area) => area.id !== selectedArea.id);
    setAreas(remaining);
    setSelectedAreaId('');
    setPlacements([]);

    if (remaining.length > 0) {
      selectArea(remaining[0]);
    }
  }

  function onDropUnit(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!selectedArea || mode !== 'edit') return;

    const unitId = event.dataTransfer.getData('text/unit-id');
    if (!unitId) return;

    if (placementByUnitId.has(unitId)) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.container().getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const next = createPlacement(unitId, placements.length, x - 55, y - 25);
    setPlacements([...placements, next]);
  }

  function updatePlacement(id: string, patch: Partial<Placement>) {
    setPlacements((previous) =>
      previous.map((placement) => (placement.id === id ? { ...placement, ...patch } : placement))
    );
  }

  function removePlacement(id: string) {
    setPlacements((previous) => previous.filter((placement) => placement.id !== id));
    if (selectedPlacementId === id) {
      setSelectedPlacementId(null);
    }
  }

  async function handleSaveArea() {
    if (!selectedArea) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/locations/${locationId}/areas/${selectedArea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...areaMeta,
          placements: placements.map((placement, index) => ({
            ...placement,
            zIndex: index,
          })),
        }),
      });

      if (!response.ok) {
        setError('Failed to save area');
        return;
      }

      const updated = await response.json();
      const nextAreas = areas.map((area) =>
        area.id === selectedArea.id
          ? {
              ...area,
              ...updated,
              placements: placements.map((placement, index) => ({
                ...placement,
                zIndex: index,
                unit: unitMap.get(placement.unitId)!,
              })),
            }
          : area
      );

      setAreas(nextAreas);
      setMode('view');
    } catch (e) {
      setError('Failed to save area');
    } finally {
      setSaving(false);
    }
  }

  async function handleBackgroundUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError('Background image must be 3MB or smaller');
      if (backgroundFileInputRef.current) {
        backgroundFileInputRef.current.value = '';
      }
      return;
    }

    setUploadingBackground(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'location-area-background');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error || payload.details || 'Failed to upload background image');
        return;
      }

      setAreaMeta((previous) => ({
        ...previous,
        backgroundImageUrl: payload.url,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload background image');
    } finally {
      setUploadingBackground(false);
      if (backgroundFileInputRef.current) {
        backgroundFileInputRef.current.value = '';
      }
    }
  }

  if (loading) {
    return <p className="text-[var(--text-muted)]">Loading areas...</p>;
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-xl border border-[var(--danger)] p-3 text-sm text-[var(--danger)]">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>Areas</CardTitle>
          <CardDescription>Create one or more canvases per location and map units visually.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {areas.map((area) => (
              <Button
                key={area.id}
                type="button"
                variant={selectedAreaId === area.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => selectArea(area)}
              >
                {area.name}
              </Button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Input
              value={newAreaName}
              onChange={(event) => setNewAreaName(event.target.value)}
              placeholder="New area name"
              className="max-w-xs"
            />
            <Button type="button" onClick={handleCreateArea}>
              <Plus className="mr-2 h-4 w-4" />
              Add Area
            </Button>
            {selectedArea && (
              <Button type="button" variant="outline" onClick={handleDeleteArea}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Area
              </Button>
            )}
            {selectedArea && (
              <Button
                type="button"
                variant={mode === 'edit' ? 'secondary' : 'outline'}
                onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')}
              >
                {mode === 'edit' ? 'View Mode' : 'Edit Mode'}
              </Button>
            )}
            {selectedArea && mode === 'edit' && (
              <Button type="button" onClick={handleSaveArea} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Layout'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedArea ? (
        <Card>
          <CardContent className="p-6 text-[var(--text-muted)]">Create an area to start mapping units.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Area Settings</CardTitle>
              <CardDescription>Background and canvas properties.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={areaMeta.name}
                onChange={(event) => setAreaMeta({ ...areaMeta, name: event.target.value })}
                placeholder="Area name"
                disabled={mode !== 'edit'}
              />
              <Input
                value={areaMeta.backgroundImageUrl}
                onChange={(event) => setAreaMeta({ ...areaMeta, backgroundImageUrl: event.target.value })}
                placeholder="Background image URL"
                disabled={mode !== 'edit'}
              />
              <input
                ref={backgroundFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                onChange={handleBackgroundUpload}
                className="hidden"
                disabled={mode !== 'edit' || uploadingBackground}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backgroundFileInputRef.current?.click()}
                  disabled={mode !== 'edit' || uploadingBackground}
                >
                  {uploadingBackground ? (
                    <Upload className="mr-2 h-4 w-4" />
                  ) : (
                    <ImagePlus className="mr-2 h-4 w-4" />
                  )}
                  {uploadingBackground ? 'Uploading...' : 'Upload Background'}
                </Button>
                {areaMeta.backgroundImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAreaMeta({ ...areaMeta, backgroundImageUrl: '' })}
                    disabled={mode !== 'edit' || uploadingBackground}
                  >
                    Remove Background
                  </Button>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">PNG, JPG, GIF, WebP, or SVG up to 3MB.</p>
              <Input
                value={areaMeta.description}
                onChange={(event) => setAreaMeta({ ...areaMeta, description: event.target.value })}
                placeholder="Description"
                disabled={mode !== 'edit'}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={areaMeta.canvasWidth}
                  onChange={(event) => setAreaMeta({ ...areaMeta, canvasWidth: Number(event.target.value) || 1400 })}
                  placeholder="Width"
                  disabled={mode !== 'edit'}
                />
                <Input
                  type="number"
                  value={areaMeta.canvasHeight}
                  onChange={(event) => setAreaMeta({ ...areaMeta, canvasHeight: Number(event.target.value) || 820 })}
                  placeholder="Height"
                  disabled={mode !== 'edit'}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text-strong)]">Units</p>
                <div className="mb-3 space-y-2">
                  <Input
                    value={unitSearch}
                    onChange={(event) => setUnitSearch(event.target.value)}
                    placeholder="Search unit number..."
                  />
                  <select
                    value={sizeFilter}
                    onChange={(event) => setSizeFilter(event.target.value)}
                    className="h-10 w-full rounded-xl border px-3 text-sm"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}
                  >
                    <option value="ALL">All sizes</option>
                    {sizeOptions.map((size) => (
                      <option key={size} value={String(size)}>{formatUnitSizeLabel(size)}</option>
                    ))}
                  </select>
                </div>
                <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                  {filteredGroupedUnits.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{group.label}</p>
                      {group.items.map((unit) => {
                        const placed = placementByUnitId.has(unit.id);
                        return (
                          <div
                            key={unit.id}
                            draggable={mode === 'edit' && !placed}
                            onDragStart={(event) => {
                              event.dataTransfer.setData('text/unit-id', unit.id);
                            }}
                            className="rounded-lg border p-2 text-sm"
                            style={{
                              borderColor: 'var(--border)',
                              backgroundColor: placed ? 'var(--surface-1)' : 'var(--surface-0)',
                              cursor: mode === 'edit' && !placed ? 'grab' : 'default',
                              opacity: placed ? 0.65 : 1,
                            }}
                          >
                            <div className="font-semibold">{formatUnitDisplayName(unit)}</div>
                            <div className="text-xs text-[var(--text-muted)]">{unit.status}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {filteredGroupedUnits.length === 0 && (
                    <p className="py-4 text-sm text-[var(--text-muted)]">No units match your filters.</p>
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  {mode === 'edit'
                    ? 'Drag unplaced units to the canvas to create boxes.'
                    : 'Switch to edit mode to place and modify units.'}
                </p>

                {mode === 'edit' && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-[var(--text-strong)]">Placed on canvas</p>
                    <div className="max-h-[200px] space-y-2 overflow-auto pr-1">
                      {placedUnits.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">No units placed yet.</p>
                      ) : (
                        placedUnits.map(({ placementId, unit }) => (
                          <div key={placementId} className="flex items-center justify-between rounded-lg border px-2 py-1.5"
                            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-0)' }}>
                            <span className="text-sm">{formatUnitDisplayName(unit)}</span>
                            <Button type="button" size="sm" variant="outline" onClick={() => removePlacement(placementId)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Area Canvas</CardTitle>
              <CardDescription>
                {mode === 'edit'
                  ? 'Drag units, resize/rotate boxes, then save layout.'
                  : 'Current occupancy view with color-coded units.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDropUnit}
              >
                <Stage ref={stageRef} width={areaMeta.canvasWidth} height={areaMeta.canvasHeight}>
                  <Layer>
                    {backgroundImage && (
                      <KonvaImage image={backgroundImage} width={areaMeta.canvasWidth} height={areaMeta.canvasHeight} listening={false} />
                    )}

                    {[...placements]
                      .sort((a, b) => a.zIndex - b.zIndex)
                      .map((placement) => {
                        const unit = unitMap.get(placement.unitId);
                        if (!unit) return null;

                        const fill = statusFill(unit.status);
                        const label = placement.label || formatUnitDisplayName(unit);

                        return (
                          <Fragment key={placement.id}>
                            <Rect
                              id={`shape-${placement.id}`}
                              x={placement.x}
                              y={placement.y}
                              width={placement.width}
                              height={placement.height}
                              rotation={placement.rotation}
                              fill={fill}
                              stroke={selectedPlacementId === placement.id ? '#111827' : '#e5e7eb'}
                              strokeWidth={selectedPlacementId === placement.id ? 2 : 1}
                              draggable={mode === 'edit'}
                              opacity={0.9}
                              onClick={() => setSelectedPlacementId(placement.id)}
                              onTap={() => setSelectedPlacementId(placement.id)}
                              onDblClick={() => {
                                if (mode !== 'edit') return;
                                removePlacement(placement.id);
                              }}
                              onDblTap={() => {
                                if (mode !== 'edit') return;
                                removePlacement(placement.id);
                              }}
                              onDragEnd={(event) => {
                                if (mode !== 'edit') return;
                                updatePlacement(placement.id, {
                                  x: event.target.x(),
                                  y: event.target.y(),
                                });
                              }}
                              onTransformEnd={(event) => {
                                if (mode !== 'edit') return;
                                const node = event.target;
                                const scaleX = node.scaleX();
                                const scaleY = node.scaleY();

                                node.scaleX(1);
                                node.scaleY(1);

                                updatePlacement(placement.id, {
                                  x: node.x(),
                                  y: node.y(),
                                  width: Math.max(32, node.width() * scaleX),
                                  height: Math.max(20, node.height() * scaleY),
                                  rotation: node.rotation(),
                                });
                              }}
                            />
                            <Text
                              x={placement.x + 6}
                              y={placement.y + 6}
                              width={Math.max(20, placement.width - 12)}
                              text={label}
                              fill="#0b1020"
                              fontSize={12}
                              fontStyle="bold"
                              listening={false}
                              rotation={placement.rotation}
                            />
                          </Fragment>
                        );
                      })}

                    {mode === 'edit' && <Transformer ref={transformerRef} rotateEnabled={true} keepRatio={false} />}
                  </Layer>
                </Stage>
              </div>

              {mode === 'edit' && selectedPlacementId && (
                <div className="mt-3 flex gap-2">
                  <Button type="button" variant="outline" onClick={() => removePlacement(selectedPlacementId)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Selected Box
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
