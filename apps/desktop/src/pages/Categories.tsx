import { useEffect, useState } from 'preact/hooks'
import {
  Button,
  Dialog,
  DialogConfirm,
  Input,
  PageLoader,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import { getCategoryIcon } from '../lib/category-icons'
import { fileToCompressedDataUrl } from '../lib/image-encode'
import { type Category, categoryService } from '../services/categories-turso'

interface EditCategoryModalProps {
  category: Category | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

function EditCategoryModal({ category, isOpen, onClose, onSave }: EditCategoryModalProps) {
  const { t } = useTranslation()
  const panelClass = 'rounded-cards border border-fog-border bg-canvas p-6 '

  const [formData, setFormData] = useState({ name: '', image: '', sortOrder: 0, isActive: true })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (category && isOpen) {
      setFormData({
        name: category.name,
        image: category.image || '',
        sortOrder: category.sortOrder,
        isActive: category.isActive,
      })
    } else if (isOpen) {
      setFormData({ name: '', image: '', sortOrder: 0, isActive: true })
    }
    setError('')
  }, [category, isOpen])

  const handleImageSelection = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      return
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      setFormData((prev) => ({ ...prev, image: dataUrl }))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      input.value = ''
    }
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: '' }))
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = category
        ? await categoryService.updateCategory(category.id, {
            name: formData.name,
            image: formData.image || undefined,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
          })
        : await categoryService.createCategory({
            name: formData.name,
            image: formData.image || undefined,
            sortOrder: formData.sortOrder,
            isActive: formData.isActive,
          })

      if (result.success) {
        onSave()
        onClose()
      } else {
        setError(result.error || t('errors.generic'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={category ? t('categoryManagement.editCategory') : t('categoryManagement.addCategory')}
      size="md"
    >
      <div>
        {error && (
          <div class="mb-6 rounded-cards border border-fog-border bg-chalk px-4 py-3 text-void ">
            <div class="flex items-center">
              <span class="text-void mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        <div class={panelClass}>
          <form onSubmit={handleSubmit} class="space-y-6">
            <div>
              <Input
                label={t('categoryManagement.categoryName')}
                value={formData.name}
                onInput={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                required
                class="bg-canvas text-void"
                placeholder={t('categoryManagement.categoryName')}
              />
            </div>

            <div>
              <span class="mb-2 block text-sm font-medium text-void">{t('categoryManagement.categoryImage')}</span>
              <div class="flex items-center gap-4">
                <div class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-cards border border-fog-border bg-chalk">
                  {formData.image ? (
                    <img src={formData.image} alt={formData.name} class="h-full w-full object-cover" />
                  ) : (
                    <span class="text-2xl">{getCategoryIcon(formData.name)}</span>
                  )}
                </div>
                <div>
                  <p class="mt-1 text-xs text-graphite ">{t('categoryManagement.imageHelp')}</p>
                  <div class="mt-3 flex items-center gap-2">
                    <label class="inline-flex cursor-pointer items-center rounded-cards border border-fog-border bg-chalk px-4 py-2 text-sm font-medium text-void transition-colors hover:bg-chalk ">
                      <span>
                        {formData.image ? t('categoryManagement.changeImage') : t('categoryManagement.uploadImage')}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        class="sr-only"
                        onChange={handleImageSelection}
                        disabled={isLoading}
                      />
                    </label>
                    {formData.image && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRemoveImage}
                        disabled={isLoading}
                      >
                        {t('categoryManagement.removeImage')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Input
                label={t('categoryManagement.order')}
                type="number"
                value={formData.sortOrder.toString()}
                onInput={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt((e.target as HTMLInputElement).value, 10) || 0,
                  })
                }
                class="bg-canvas text-void"
                placeholder="0"
              />
              <p class="mt-1 text-xs text-graphite ">{t('categoryManagement.orderHelp')}</p>
            </div>

            <div>
              <Select
                label={t('common.status')}
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: (e.target as HTMLSelectElement).value === 'active' })
                }
                options={[
                  { value: 'active', label: t('categoryManagement.active') },
                  { value: 'inactive', label: t('categoryManagement.inactive') },
                ]}
                class="bg-canvas"
              />
            </div>

            <div class="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  )
}

export default function Categories() {
  const { t } = useTranslation()
  const panelClass = 'rounded-cards border border-fog-border bg-canvas '

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [pageSize] = useState(50)

  const { user: currentUser, hasRole, hasPermission } = useAuth()

  const canManageCategories = currentUser && (hasRole('admin') || hasRole('manager') || hasPermission('products.view'))
  const canEditCategories = hasPermission('products.edit') || hasRole('admin') || hasRole('manager')
  const canCreateCategories = hasPermission('products.create') || hasRole('admin') || hasRole('manager')
  const canDeleteCategories = hasPermission('products.delete') || hasRole('admin') || hasRole('manager')

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async (page: number = 1) => {
    if (!canManageCategories) {
      setError(t('errors.unauthorized'))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const result = await categoryService.getCategoriesPaginated(page, pageSize)
      setCategories(result.categories)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
      setError('')
    } catch (_err) {
      setError(t('errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    loadCategories(page)
  }

  const handleCreateCategory = () => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const result = await categoryService.deleteCategory(id)
      if (result.success) {
        setDeleteConfirm(null)
        await loadCategories(currentPage)
      } else {
        setError(result.error || t('errors.generic'))
      }
    } catch (_err) {
      setError(t('errors.generic'))
    }
  }

  const handleSaveCategory = async () => {
    await loadCategories(currentPage)
  }

  if (!canManageCategories) {
    return (
      <div class="max-w-6xl mx-auto">
        <div class={`${panelClass} p-12`}>
          <div class="text-center">
            <div class="text-6xl mb-6 drop-shadow-sm">🔒</div>
            <h3 class="mb-3 text-2xl font-bold text-void ">{t('categoryManagement.accessDenied')}</h3>
            <p class="mx-auto max-w-md text-graphite ">{t('categoryManagement.noPermission')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading && categories.length === 0) {
    return <PageLoader message={t('categoryManagement.loading')} />
  }

  return (
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <p class="text-sm text-graphite ">
          {totalCount} {t('categoryManagement.total')}
          {totalPages > 1 && ` • ${t('products.pageXofY', { current: currentPage, total: totalPages })}`}
        </p>
        {canCreateCategories && (
          <Button class="w-full sm:w-auto" onClick={handleCreateCategory}>
            {t('categoryManagement.addCategory')}
          </Button>
        )}
      </div>

      {error && (
        <div class="mb-6 rounded-cards border border-fog-border bg-chalk px-4 py-3 text-void ">
          <div class="flex items-center">
            <span class="text-void mr-2">⚠️</span>
            {error}
          </div>
        </div>
      )}

      <div class={`${panelClass} overflow-hidden`}>
        <Table dense striped>
          <TableHead>
            <TableRow class="bg-chalk ">
              <TableHeader class="py-2 font-semibold">{t('categoryManagement.categoryImage')}</TableHeader>
              <TableHeader class="py-2 font-semibold">{t('common.name')}</TableHeader>
              <TableHeader class="py-2 font-semibold">{t('categoryManagement.order')}</TableHeader>
              <TableHeader class="py-2 font-semibold">{t('common.status')}</TableHeader>
              <TableHeader class="py-2 font-semibold">{t('common.actions')}</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-cards border border-fog-border bg-chalk">
                    {category.image ? (
                      <img src={category.image} alt={category.name} class="h-full w-full object-cover" />
                    ) : (
                      <span class="text-lg">{getCategoryIcon(category.name)}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell class="font-medium text-void">{category.name}</TableCell>
                <TableCell class="text-void">{category.sortOrder}</TableCell>
                <TableCell>
                  <span class="inline-flex items-center rounded-chips border border-fog-border bg-chalk px-2 py-0.5 text-xs text-void">
                    {category.isActive ? t('categoryManagement.active') : t('categoryManagement.inactive')}
                  </span>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    {canEditCategories && (
                      <Button size="sm" variant="outline" onClick={() => handleEditCategory(category)}>
                        {t('common.edit')}
                      </Button>
                    )}
                    {canDeleteCategories && (
                      <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(category.id)}>
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalCount={totalCount}
          pageSize={pageSize}
          isLoading={isLoading}
        />
      )}

      {categories.length === 0 && (
        <div class={`${panelClass} p-12`}>
          <div class="text-center">
            <div class="text-6xl mb-6">🏷️</div>
            <h3 class="mb-3 text-2xl font-bold text-void ">{t('categoryManagement.noCategories')}</h3>
            <p class="mx-auto mb-6 max-w-md text-graphite ">{t('categoryManagement.emptyCatalog')}</p>
            {canCreateCategories && (
              <Button onClick={handleCreateCategory} class="mt-4">
                {t('categoryManagement.addFirst')}
              </Button>
            )}
          </div>
        </div>
      )}

      <EditCategoryModal
        category={editingCategory}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingCategory(null)
        }}
        onSave={handleSaveCategory}
      />

      <DialogConfirm
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteCategory(deleteConfirm)}
        title={t('categoryManagement.deleteConfirm')}
        message={t('categoryManagement.deleteMessage')}
        confirmText={t('common.delete')}
        variant="danger"
      />
    </div>
  )
}
