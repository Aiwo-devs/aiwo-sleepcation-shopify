if (!window.Eurus.loadedScript.has('frequently-bought-together.js')) {
  window.Eurus.loadedScript.add('frequently-bought-together.js');
  
  requestAnimationFrame(() => {
    document.addEventListener("alpine:init", () => {
      Alpine.data('xProductFrequently', (
        sectionId
      ) => ({
        load: false,
        show: false,
        products: "",
        productsList: [],
        productsListDraft: [],
        loading: false,
        addToCartButton: "",
        errorMessage: false,
        isSelectItems: false,
        init() {
          this.$watch('productsListDraft', () => {
            if (this.productsList === this.productsListDraft) {
              this.isSelectItems = false;
            } else {
              this.isSelectItems = true;
            }
            document.dispatchEvent(new CustomEvent(`eurus:product-fbt:productsList-changed-${sectionId}`, {
              detail: {
                productsList: this.productsListDraft
              }
            }));
          });
        },
        renderRatingYotpo(el) {
          const arrayRatingYotpo = Array.from(document.getElementById(`list-rating-yotpo-${sectionId}`).children)
          Array.from(el.querySelectorAll('.rating-review')).map((item, index) => {
            for (let i=0; i<arrayRatingYotpo.length; i++) {
              if (item.querySelector('.yotpo') || item.querySelector('.yotpo') != null ) {
                let checkReplaceRating = false
                const interval = setInterval(() => {
                  if (arrayRatingYotpo[i].querySelector('.star-container') || arrayRatingYotpo[i].querySelector('.yotpo-sr-bottom-line-left-panel')) {
                    if (item.querySelector('.yotpo') && item.querySelector('.yotpo').getAttribute('data-product-id') == arrayRatingYotpo[i].querySelector('.yotpo-widget-instance').getAttribute('data-yotpo-product-id')) {
                      item.innerHTML = arrayRatingYotpo[i].innerHTML
                      checkReplaceRating = true
                    }
                    clearInterval(interval)
                  }
                }, 500)
                if (checkReplaceRating) {
                  break;
                }
                setTimeout(() => {
                  if (interval) {
                    clearInterval(interval)
                  }
                }, 3000)
              }
            }
          })
        },
        openPopup() {
          this.show = true;
          Alpine.store('xPopup').open = true;
        },
        closePopup() {
          this.show = false;
          Alpine.store('xPopup').close();
        },
        addToListDraft(el, productId, productUrl, hasVariant, cal, name_edt) {
          let productsListDraft = JSON.parse(JSON.stringify(this.productsListDraft));
          const productName = el.closest(".x-product-fbt-data").querySelector(".product-name").textContent;

          let currentVariant =  JSON.parse(el.closest(".x-product-fbt-data").querySelector(".current-variant").textContent);
          if(Object.keys(currentVariant).length === 0) {
            let variantsData = el.closest(".x-product-fbt-data").querySelector('[type="application/json"]');
            if (variantsData) {
              let productVariants = JSON.parse(el.closest(".x-product-fbt-data").querySelector('[type="application/json"]').textContent);
              for (const variant of productVariants) {
                if (variant.available) {
                  currentVariant = variant;
                  break;
                }
              }
            }
          }         
          const price = !hasVariant && JSON.parse(el.closest(".x-product-fbt-data").querySelector(".current-price").textContent);
          const featured_image = currentVariant.featured_image ? currentVariant.featured_image.src : el.closest(".x-product-fbt-data").querySelector(".featured-image").textContent;
          const vendor = el.closest(".x-product-fbt-data").querySelector(".vendor") ? el.closest(".x-product-fbt-data").querySelector(".vendor")?.textContent : '';
          const rating = el.closest(".x-product-fbt-data").querySelector(".rating-fbt-mini") ? el.closest(".x-product-fbt-data").querySelector(".rating-fbt-mini")?.innerHTML : '';
          const edtElement = el.closest(".x-product-fbt-data").querySelector('.hidden.cart-edt-properties');
          let shippingMessage = '';
          if(edtElement){
            shippingMessage = edtElement.value.replace("time_to_cut_off", Alpine.store('xEstimateDelivery').noti);
          }
          const preorderElement = el.closest(".x-product-fbt-data").querySelector('.hidden.preorder-edt-properties');
          let preorderMessage = '';
          if(preorderElement){
            preorderMessage = preorderElement.value;
          }
          
          const properties = {
            ...(name_edt && shippingMessage && { [name_edt]: shippingMessage }),
            ...(preorderMessage && { Preorder: preorderMessage }),
          };          

          let productQuantity = parseInt(el.closest(".x-product-fbt-data").querySelector(".current-quantity").value);
          if (cal == 'plus') {
            productQuantity = productQuantity + 1;
          } 
          if (cal == 'minus') {
            productQuantity = productQuantity - 1;
          }
          let variantId = hasVariant ? currentVariant.id : currentVariant; 
          let newProductsListDraft = [];
          let newItem = hasVariant ? { ...currentVariant, title: currentVariant.title.replaceAll("\\",""), product_id: productId, product_name: productName, productUrl: `${productUrl}?variant=${currentVariant.id}`, featured_image: featured_image, quantity: productQuantity, vendor: vendor, rating: rating, "properties": properties} : { id: variantId, product_id: productId, product_name: productName, productUrl: productUrl, featured_image: featured_image, quantity: productQuantity, price: price, vendor: vendor, rating: rating, "properties": properties}
          productsListDraft = productsListDraft.filter(item => item.id !== variantId);
          newProductsListDraft = [...productsListDraft , newItem];
          newProductsListDraft = newProductsListDraft.filter(item => item.quantity > 0);
          this.productsListDraft = newProductsListDraft;
          this.errorMessage = false;
        },
        addToList(el) {
          this.productsList = this.productsListDraft;
          this.closePopup(el);
        },
        handleAddToCart(el) {
          this.loading = true;

          setTimeout(() => {
            let items = JSON.parse(JSON.stringify(this.productsList));

            fetch(window.Shopify.routes.root + 'cart/add.js', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body:  JSON.stringify({ "items": items, "sections":  Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id) })
            }).then((response) => {
              return response.json();
            }).then((response) => {
              if (response.status == '422') {
                const error_message = el.closest('.list-items').querySelector('.cart-warning');
  
                this.errorMessage = true;
                if (error_message) {
                  error_message.textContent = response.description;
                }
                return;
              } 
  
              this.errorMessage = false;
  
              Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
                const sectionElement = document.querySelector(section.selector);
  
                if (sectionElement) {
                  if (response.sections[section.id])
                    sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
                }
              }));
              if (Alpine.store('xQuickView') && Alpine.store('xQuickView').show) {
                Alpine.store('xQuickView').show = false;
              }
              Alpine.store('xPopup').close();
              if (Alpine.store('xCartNoti') && Alpine.store('xCartNoti').enable) {
                Alpine.store('xCartNoti').setItem(response); 
              } else {
                Alpine.store('xMiniCart').openCart();
                document.dispatchEvent(new CustomEvent("eurus:cart:redirect"));
              }
              Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
              document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));
              this.productsList = [];
              this.productsListDraft = [];
              this.totalPrice = 0;
            })
            .catch((error) => {
              console.error('Error:', error);
            }).finally(() => {
              this.loading = false;
            })
          }, 0)
        },
        removeItem(el, indexItem) {
          let item = this.productsList[indexItem]
          let newProductsList = this.productsList.filter((item, index) => index != indexItem)
          this.productsList = newProductsList;
          this.productsListDraft = this.productsList;
          document.dispatchEvent(new CustomEvent(`eurus:product-bundle:remove-item-${sectionId}`, {
            detail: {
              item: item,
              el: el
            }
          }));
        }
      }));

      Alpine.data('xProductItemFBT', (
        el,
        sectionId,
        handleSectionId,
        productUrl,
        hasVariant
      ) => ({
        qty: 1,
        productList: [],
        currentVariant: '',
        showButton: true,
        productUrl: productUrl,
        init() {
          if (hasVariant) {
            document.addEventListener(`eurus:product-card-variant-select:updated:${sectionId}`, (e) => {
              this.currentVariant = e.detail.currentVariant
              if (this.currentVariant && this.currentVariant.id) {
                this.productUrl = productUrl + `/?variant=${this.currentVariant.id}`
              }
              if (this.currentVariant) {
                this.renderAddButton();
              } else {
                this.showButton = true;
              }
            });
          }

          document.addEventListener(`eurus:product-fbt:productsList-changed-${handleSectionId}`, (e) => {
            this.productList = e.detail.productsList;
            this.renderAddButton();
          })
        },
        renderAddButton() {
          let currentVariant = JSON.parse(document.getElementById('current-variant-'+ sectionId).textContent);
          if(typeof currentVariant === 'object' && Object.keys(currentVariant).length === 0) {
            let productVariants = JSON.parse(el.closest(".x-product-fbt-data").querySelector('[type="application/json"]').textContent);
            for (const variant of productVariants) {
              if (variant.available) {
                currentVariant = variant;
                break;
              }
            }
          }
          let variantId = typeof currentVariant === 'object' ? currentVariant?.id : currentVariant;
          const itemVariant = this.productList.find(({ id }) => id === variantId);
          if (itemVariant) {
            this.showButton = false;
            this.qty = itemVariant.quantity;
          } else {
            this.showButton = true;
            this.qty = 1;
          }
        },
        minus(value) {
          this.qty = parseInt(this.qty);
          (this.qty == 1) ? this.qty = 1 : this.qty -= value;
        },
        plus(value) {
          this.qty = parseInt(this.qty);
          this.qty += value;
        },
        invalid(el) {
          number = parseFloat(el.value);
          if (!Number.isInteger(number) || number < 1) {
            this.qty = 1;
          }
        }
      }));
    });
  });
}