import { useEffect, useState } from 'react'
import './App.css'

const navigation = [
  { id: 'overview', label: 'Overview', icon: '◫' },
  { id: 'products', label: 'Products', icon: '▦' },
  { id: 'inventory', label: 'Inventory', icon: '↕' },
  { id: 'sales', label: 'Sales', icon: '⌁' },
  { id: 'reports', label: 'Reports', icon: '▤' },
]

const emptyDashboard = { productCount: 0, lowStockCount: 0, movementsToday: 0, lowStockItems: [], recentMovements: [] }

function App() {
  const [activePage, setActivePage] = useState('overview')
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [dashboard, setDashboard] = useState(emptyDashboard)
  const [dashboardError, setDashboardError] = useState('')
  const [showProductForm, setShowProductForm] = useState(false)
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productQuantity, setProductQuantity] = useState('0')
  const [productReorderLevel, setProductReorderLevel] = useState('0')
  const [productFormError, setProductFormError] = useState('')
  const [productNotice, setProductNotice] = useState('')
  const [productSaving, setProductSaving] = useState(false)
  const [inventoryError, setInventoryError] = useState('')
  const [adjustments, setAdjustments] = useState({})
  const [movements, setMovements] = useState({})
  const currentPage = navigation.find((item) => item.id === activePage)

  async function requestJson(url, options) {
    const response = await fetch(url, options)
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.message || 'The request could not be completed.')
    return result
  }

  async function loadDashboard() {
    try {
      setDashboard(await requestJson('/api/dashboard'))
      setDashboardError('')
    } catch (error) {
      setDashboardError(error.message || 'Dashboard data could not be loaded.')
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { void loadDashboard() }, 0)
    return () => clearTimeout(timer)
  }, [])

  async function loadProducts() {
    setProductsLoading(true)
    try {
      const loadedProducts = await requestJson('/api/items')
      if (!Array.isArray(loadedProducts)) throw new Error('The product list response was not in the expected format.')
      setProducts(loadedProducts)
      setProductsError('')
    } catch (error) {
      setProductsError(error.message || 'Products could not be loaded.')
    } finally {
      setProductsLoading(false)
    }
  }

  function navigateTo(page) {
    setActivePage(page)
    if (page === 'products' || page === 'inventory') loadProducts()
    if (page === 'overview') loadDashboard()
  }

  function openProductForm() {
    setProductFormError('')
    setProductNotice('')
    setShowProductForm(true)
    navigateTo('products')
  }

  async function handleProductSubmit(event) {
    event.preventDefault()
    const name = productName.trim()
    const description = productDescription.trim()
    const quantity = Number(productQuantity)
    const reorderLevel = Number(productReorderLevel)
    if (!name) return setProductFormError('Product name is required.')
    if (!Number.isInteger(quantity) || quantity < 0) return setProductFormError('Starting stock must be a whole number of zero or more.')
    if (!Number.isInteger(reorderLevel) || reorderLevel < 0) return setProductFormError('Reorder level must be a whole number of zero or more.')
    setProductSaving(true)
    setProductFormError('')
    try {
      const result = await requestJson('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, quantity, reorderLevel }) })
      setProducts((current) => [...current, result].sort((left, right) => left.name.localeCompare(right.name)))
      setProductName(''); setProductDescription(''); setProductQuantity('0'); setProductReorderLevel('0')
      setShowProductForm(false)
      setProductNotice(`${result.name} was added to the catalog.`)
      loadDashboard()
    } catch (error) {
      setProductFormError(error.message || 'Product could not be added.')
    } finally {
      setProductSaving(false)
    }
  }

  async function saveAdjustment(product) {
    const adjustment = adjustments[product.id] || { amount: '', reason: '' }
    const amount = Number(adjustment.amount)
    if (!Number.isInteger(amount) || amount === 0) return setInventoryError('Enter a whole-number adjustment other than zero.')
    if (product.quantity + amount < 0) return setInventoryError(`This adjustment would make ${product.name} stock negative.`)
    setInventoryError('')
    try {
      const updatedProduct = await requestJson(`/api/items/${product.id}/quantity`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: product.quantity + amount, reason: adjustment.reason }) })
      setProducts((current) => current.map((item) => item.id === updatedProduct.id ? updatedProduct : item))
      setAdjustments((current) => ({ ...current, [product.id]: { amount: '', reason: '' } }))
      setProductNotice(`${product.name} stock was updated by ${amount > 0 ? '+' : ''}${amount}.`)
      loadDashboard()
      loadMovements(product.id)
    } catch (error) {
      setInventoryError(error.message || 'Stock could not be updated.')
    }
  }

  async function loadMovements(productId) {
    try {
      const result = await requestJson(`/api/items/${productId}/movements`)
      setMovements((current) => ({ ...current, [productId]: result }))
    } catch (error) {
      setInventoryError(error.message || 'Movement history could not be loaded.')
    }
  }

  function updateAdjustment(productId, field, value) {
    setAdjustments((current) => ({ ...current, [productId]: { amount: '', reason: '', ...current[productId], [field]: value } }))
  }

  const metrics = [
    { label: 'Products in catalog', value: dashboard.productCount, note: 'Products saved in your catalog', tone: 'blue' },
    { label: 'Items low in stock', value: dashboard.lowStockCount, note: 'At or below their reorder level', tone: 'amber' },
    { label: 'Stock movements today', value: dashboard.movementsToday, note: 'Recorded inventory changes', tone: 'green' },
  ]

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => navigateTo('overview')}><span className="brand-mark" aria-hidden="true">S</span><span className="brand-copy"><strong>stockwise</strong><small>INVENTORY WORKSPACE</small></span></a>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{navigation.map((item) => <button className={`nav-item${activePage === item.id ? ' is-active' : ''}`} key={item.id} type="button" aria-current={activePage === item.id ? 'page' : undefined} onClick={() => navigateTo(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.id === 'overview' && <span className="active-dot" aria-hidden="true" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="store-avatar" aria-hidden="true">KS</div><div className="store-copy"><strong>My store</strong><span>Workspace setup</span></div><span className="more-icon" aria-hidden="true">···</span></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-divider">/</span><strong>{currentPage.label}</strong></div><div className="topbar-right"><span className="connection-status"><span className="status-dot" /> Local workspace</span><button className="profile-button" type="button" aria-label="Account menu">S</button></div></header>
      {activePage === 'overview' && <section className="page-content" aria-labelledby="page-title">
        <div className="page-heading"><div><p className="eyebrow">YOUR STORE, AT A GLANCE</p><h1 id="page-title">Inventory overview</h1><p className="page-description">A clear view of your products, stock, and daily activity.</p></div><div className="heading-actions"><button className="button button-secondary" type="button" onClick={() => navigateTo('inventory')}>↕ Adjust stock</button><button className="button button-primary" type="button" onClick={openProductForm}>＋ Add product</button></div></div>
        {dashboardError && <p className="form-error" role="alert">Couldn’t load dashboard: {dashboardError}</p>}
        <div className="metrics-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><div className="metric-topline"><span>{metric.label}</span><span className={`metric-marker ${metric.tone}`} /></div><strong className="metric-value">{metric.value}</strong><span className="metric-note">{metric.note}</span></article>)}</div>
        <div className="content-grid">
          <section className="panel stock-panel" aria-labelledby="stock-title"><div className="panel-heading"><div><h2 id="stock-title">Stock to watch</h2><p>Products at or below their reorder level</p></div><button className="text-button" type="button" onClick={() => navigateTo('inventory')}>View inventory →</button></div>{dashboard.lowStockItems.length === 0 ? <div className="empty-state"><span className="empty-icon" aria-hidden="true">▤</span><strong>No low-stock products</strong><span>Set reorder levels to receive stock alerts here.</span></div> : <ul className="watch-list">{dashboard.lowStockItems.map((item) => <li key={item.id}><strong>{item.name}</strong><span>{item.quantity} in stock · reorder at {item.reorderLevel}</span></li>)}</ul>}</section>
          <section className="panel activity-panel" aria-labelledby="activity-title"><div className="panel-heading"><div><h2 id="activity-title">Recent activity</h2><p>Latest changes in your store</p></div><span className="activity-clock" aria-hidden="true">◷</span></div>{dashboard.recentMovements.length === 0 ? <div className="activity-empty"><span className="activity-line" /><span>No activity yet</span><small>Stock updates will show here.</small></div> : <ul className="activity-list">{dashboard.recentMovements.slice(0, 5).map((movement) => <li key={movement.id}><strong>{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange} {movement.itemName}</strong><span>{movement.reason}</span></li>)}</ul>}</section>
        </div>
      </section>}
      {activePage === 'products' && <section className="page-content products-page" aria-labelledby="page-title">
        <div className="page-heading"><div><p className="eyebrow">PRODUCT CATALOG</p><h1 id="page-title">Products</h1><p className="page-description">Add products and set reorder points for proactive stock alerts.</p></div><div className="heading-actions"><button className="button button-secondary" type="button" onClick={loadProducts} disabled={productsLoading}>↻ Refresh</button><button className="button button-primary" type="button" onClick={openProductForm}>＋ Add product</button></div></div>
        {productNotice && <p className="product-notice" role="status">{productNotice}</p>}
        {showProductForm && <section className="panel product-form-panel" aria-labelledby="add-product-title"><div className="panel-heading"><div><h2 id="add-product-title">Add a product</h2><p>Define starting stock and when it should be reordered.</p></div></div><form className="product-form" onSubmit={handleProductSubmit}><div className="product-form-grid"><label className="form-field" htmlFor="product-name"><span>Product name <span className="required-mark">*</span></span><input autoFocus id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} maxLength={120} required /></label><label className="form-field" htmlFor="product-description"><span>Description <span className="optional-label">Optional</span></span><textarea id="product-description" rows="3" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} maxLength={255} /></label><label className="form-field" htmlFor="product-quantity"><span>Starting stock</span><input id="product-quantity" type="number" min="0" step="1" value={productQuantity} onChange={(event) => setProductQuantity(event.target.value)} /></label><label className="form-field" htmlFor="reorder-level"><span>Reorder level</span><input id="reorder-level" type="number" min="0" step="1" value={productReorderLevel} onChange={(event) => setProductReorderLevel(event.target.value)} /></label></div>{productFormError && <p className="form-error" role="alert">{productFormError}</p>}<div className="form-actions"><button className="button button-secondary" type="button" onClick={() => setShowProductForm(false)} disabled={productSaving}>Cancel</button><button className="button button-primary" type="submit" disabled={productSaving}>{productSaving ? 'Saving…' : 'Save product'}</button></div></form></section>}
        <Catalog products={products} loading={productsLoading} error={productsError} refresh={loadProducts} add={openProductForm} />
      </section>}
      {activePage === 'inventory' && <section className="page-content products-page" aria-labelledby="page-title"><div className="page-heading"><div><p className="eyebrow">STOCK CONTROL</p><h1 id="page-title">Inventory</h1><p className="page-description">Record a stock adjustment and keep a clear activity history.</p></div></div>{productNotice && <p className="product-notice" role="status">{productNotice}</p>}{inventoryError && <p className="form-error" role="alert">{inventoryError}</p>}<Inventory products={products} loading={productsLoading} error={productsError} adjustments={adjustments} movements={movements} updateAdjustment={updateAdjustment} saveAdjustment={saveAdjustment} loadMovements={loadMovements} add={openProductForm} /></section>}
      {!['overview', 'products', 'inventory'].includes(activePage) && <section className="page-content placeholder-page" aria-labelledby="page-title"><p className="eyebrow">STOCKWISE WORKSPACE</p><h1 id="page-title">{currentPage.label}</h1><div className="placeholder-card"><span className="placeholder-symbol" aria-hidden="true">{currentPage.icon}</span><h2>{currentPage.label} is being set up</h2><p>This area will connect to your inventory data as we build the next project features.</p><button className="button button-secondary" type="button" onClick={() => navigateTo('overview')}>Back to overview</button></div></section>}
    </main>
  </div>
}

function Catalog({ products, loading, error, refresh, add }) {
  return <section className="panel product-list-panel" aria-labelledby="catalog-title" aria-busy={loading}><div className="panel-heading"><div><h2 id="catalog-title">Catalog</h2><p>{products.length} {products.length === 1 ? 'product' : 'products'} saved</p></div></div>{loading ? <div className="products-message" role="status">Loading products…</div> : error ? <div className="products-message products-error" role="alert"><strong>Couldn’t load the catalog</strong><span>{error}</span><button className="text-button" type="button" onClick={refresh}>Try again →</button></div> : products.length === 0 ? <div className="empty-state products-empty-state"><span className="empty-icon" aria-hidden="true">▦</span><strong>Your catalog is empty</strong><span>Add your first product to start building your store catalog.</span><button className="button button-primary" type="button" onClick={add}>＋ Add first product</button></div> : <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Product</th><th>Description</th><th>In stock</th><th>Reorder at</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td className="product-name-cell">{product.name}</td><td className="product-description-cell">{product.description || '—'}</td><td>{product.quantity}</td><td>{product.reorderLevel}</td><td><span className={`stock-status${product.quantity <= product.reorderLevel ? ' is-low' : ''}`}>{product.quantity <= product.reorderLevel ? 'Low stock' : 'In stock'}</span></td></tr>)}</tbody></table></div>}</section>
}

function Inventory({ products, loading, error, adjustments, movements, updateAdjustment, saveAdjustment, loadMovements, add }) {
  if (loading) return <div className="products-message" role="status">Loading inventory…</div>
  if (error) return <div className="products-message products-error" role="alert">{error}</div>
  if (products.length === 0) return <div className="empty-state"><strong>No products to track yet</strong><span>Add products first, then manage their stock here.</span><button className="button button-primary" type="button" onClick={add}>Add product</button></div>
  return <section className="panel product-list-panel"><div className="product-table-wrap"><table className="product-table inventory-table"><thead><tr><th>Product</th><th>In stock</th><th>Adjustment</th><th>Note</th><th>Save</th><th>History</th></tr></thead><tbody>{products.map((product) => <ProductInventoryRow key={product.id} product={product} adjustment={adjustments[product.id]} history={movements[product.id]} updateAdjustment={updateAdjustment} saveAdjustment={saveAdjustment} loadMovements={loadMovements} />)}</tbody></table></div></section>
}

function ProductInventoryRow({ product, adjustment, history, updateAdjustment, saveAdjustment, loadMovements }) {
  return <><tr><td className="product-name-cell">{product.name}<small>Reorder at {product.reorderLevel}</small></td><td><span className={product.quantity <= product.reorderLevel ? 'low-stock-number' : ''}>{product.quantity}</span></td><td><input aria-label={`Adjustment for ${product.name}`} className="table-input amount-input" type="number" step="1" placeholder="+ / −" value={adjustment?.amount || ''} onChange={(event) => updateAdjustment(product.id, 'amount', event.target.value)} /></td><td><input aria-label={`Adjustment note for ${product.name}`} className="table-input" maxLength="120" placeholder="Manual adjustment" value={adjustment?.reason || ''} onChange={(event) => updateAdjustment(product.id, 'reason', event.target.value)} /></td><td><button className="button button-primary" type="button" onClick={() => saveAdjustment(product)}>Save</button></td><td><button className="text-button" type="button" onClick={() => loadMovements(product.id)}>View</button></td></tr>{history && <tr className="movement-row"><td colSpan="6">{history.length === 0 ? 'No stock movements recorded yet.' : <ul className="movement-list">{history.map((movement) => <li key={movement.id}><strong>{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}</strong><span>{movement.reason}</span><time>{new Date(movement.createdAt).toLocaleString()}</time></li>)}</ul>}</td></tr>}</>
}

export default App
