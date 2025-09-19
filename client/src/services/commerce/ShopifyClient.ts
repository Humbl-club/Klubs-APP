export class ShopifyClient {
  constructor(private shopDomain: string, private token: string) {}

  private async gql(query: string, variables?: Record<string, any>) {
    const res = await fetch(`https://${this.shopDomain}/api/2024-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': this.token,
      },
      body: JSON.stringify({ query, variables }),
    })
    const json = await res.json()
    if (json.errors) throw new Error(JSON.stringify(json.errors))
    return json.data
  }

  async productsByCollection(handle: string, first = 8) {
    const q = `query($handle:String!,$first:Int!){
      collectionByHandle(handle:$handle){
        title
        products(first:$first){edges{node{
          id title handle description
          featuredImage{url altText}
          variants(first:10){edges{node{ id title availableForSale price{amount currencyCode} }}}
        }}}
      }
    }`
    const data = await this.gql(q, { handle, first })
    return data.collectionByHandle?.products?.edges?.map((e:any)=>e.node) || []
  }

  async productByHandle(handle: string) {
    const q = `query($handle:String!){
      productByHandle(handle:$handle){
        id title handle description
        images(first:8){edges{node{url altText}}}
        variants(first:20){edges{node{ id title availableForSale price{amount currencyCode} }}}
      }
    }`
    const data = await this.gql(q, { handle })
    return data.productByHandle
  }

  private checkoutStorageKey() { return `shopify_checkout_${this.shopDomain}` }

  async ensureCheckout(): Promise<{ id: string; webUrl: string }> {
    const existing = localStorage.getItem(this.checkoutStorageKey())
    if (existing) return JSON.parse(existing)
    const m = `mutation{ checkoutCreate(input:{}){ checkout{ id webUrl } userErrors{message} } }`
    const data = await this.gql(m)
    const ck = data.checkoutCreate.checkout
    localStorage.setItem(this.checkoutStorageKey(), JSON.stringify(ck))
    return ck
  }

  async addLineItem(variantId: string, quantity = 1): Promise<string> {
    const ck = await this.ensureCheckout()
    const m = `mutation($id:ID!,$lines:[CheckoutLineItemInput!]!){
      checkoutLineItemsAdd(checkoutId:$id, lineItems:$lines){ checkout{ webUrl } userErrors{message} }
    }`
    const data = await this.gql(m, { id: ck.id, lines: [{ variantId, quantity }] })
    return data.checkoutLineItemsAdd.checkout.webUrl
  }

  async getCheckout(): Promise<{ id: string; webUrl: string; lineItemsCount: number } | null> {
    const stored = localStorage.getItem(this.checkoutStorageKey())
    if (!stored) return null
    const ck = JSON.parse(stored)
    const q = `query($id:ID!){ node(id:$id){ ... on Checkout { id webUrl lineItems(first:50){edges{node{ id quantity }}} } } }`
    const data = await this.gql(q, { id: ck.id })
    const node = data.node
    const count = (node?.lineItems?.edges || []).reduce((acc:number,e:any)=>acc + (e.node?.quantity||0), 0)
    return { id: node.id, webUrl: node.webUrl, lineItemsCount: count }
  }

  async listCollections(first = 20): Promise<Array<{ handle: string; title: string }>> {
    const q = `query($first:Int!){ collections(first:$first){ edges{ node{ handle title } } } }`
    const data = await this.gql(q, { first })
    const edges = data.collections?.edges || []
    return edges.map((e:any) => ({ handle: e.node.handle, title: e.node.title }))
  }

  async searchProducts(query: string, first = 10): Promise<Array<{ handle: string; title: string }>> {
    const q = `query($query:String!,$first:Int!){ products(query:$query, first:$first){ edges{ node{ handle title } } } }`
    const data = await this.gql(q, { query, first })
    const edges = data.products?.edges || []
    return edges.map((e:any) => ({ handle: e.node.handle, title: e.node.title }))
  }
}
