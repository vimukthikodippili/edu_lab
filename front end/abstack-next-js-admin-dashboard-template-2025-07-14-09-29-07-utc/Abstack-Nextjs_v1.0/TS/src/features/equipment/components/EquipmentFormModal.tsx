'use client'
import { useState } from 'react'
import { useEquipmentCategories } from '../hooks/useEquipmentCategories'
import type { Equipment, CreateEquipmentPayload, UpdateEquipmentPayload, EquipmentCondition } from '@/types/sims/equipment'

interface EquipmentFormModalProps {
  labTypeId: string
  equipment: Equipment | null
  onClose: () => void
  onSubmit: (payload: CreateEquipmentPayload | UpdateEquipmentPayload) => void
  isPending: boolean
}

export default function EquipmentFormModal({ labTypeId, equipment, onClose, onSubmit, isPending }: EquipmentFormModalProps) {
  const { data: categories, isLoading: categoriesLoading } = useEquipmentCategories(labTypeId)

  const [name, setName] = useState(equipment?.name ?? '')
  const [categoryId, setCategoryId] = useState(equipment?.categoryId ?? '')
  const [quantity, setQuantity] = useState(equipment?.quantity ?? 1)
  const [unit, setUnit] = useState(equipment?.unit ?? '')
  const [condition, setCondition] = useState<EquipmentCondition>(equipment?.condition ?? 'good')
  const [serialNumber, setSerialNumber] = useState(equipment?.serialNumber ?? '')
  const [purchaseDate, setPurchaseDate] = useState(equipment?.purchaseDate ?? '')
  const [minStockLevel, setMinStockLevel] = useState<string>(
    equipment?.minStockLevel != null ? String(equipment.minStockLevel) : '',
  )

  const isValid = name.trim() && categoryId && quantity >= 0 && unit.trim() && purchaseDate

  const handleSubmit = () => {
    if (!isValid) return
    const base = {
      name: name.trim(),
      categoryId,
      quantity,
      unit: unit.trim(),
      serialNumber: serialNumber.trim() || undefined,
      purchaseDate,
      minStockLevel: minStockLevel.trim() !== '' ? Number(minStockLevel) : undefined,
    }
    onSubmit(equipment ? base : { ...base, condition })
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1050 }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{equipment ? 'Edit Equipment' : 'Register Equipment'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label fw-semibold small">Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Digital Multimeter"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Category</label>
                  <select
                    className="form-select"
                    value={categoryId}
                    disabled={categoriesLoading}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Select category…</option>
                    {(categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Unit</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. pieces, ml, g"
                    value={unit}
                    maxLength={30}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="form-label fw-semibold small">Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold small">Min Stock Level <span className="text-muted fw-normal">(optional)</span></label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    placeholder="Leave blank if not tracked"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                {!equipment && (
                  <div className="col-6">
                    <label className="form-label fw-semibold small">Condition</label>
                    <select className="form-select" value={condition} onChange={(e) => setCondition(e.target.value as EquipmentCondition)}>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                )}
                <div className={equipment ? 'col-12' : 'col-6'}>
                  <label className="form-label fw-semibold small">Purchase Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="mb-1">
                <label className="form-label fw-semibold small">Serial Number <span className="text-muted fw-normal">(optional)</span></label>
                <input
                  type="text"
                  className="form-control"
                  value={serialNumber}
                  maxLength={120}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isPending}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" disabled={!isValid || isPending} onClick={handleSubmit}>
                {isPending ? <span className="spinner-border spinner-border-sm" /> : equipment ? 'Save Changes' : 'Register Equipment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
