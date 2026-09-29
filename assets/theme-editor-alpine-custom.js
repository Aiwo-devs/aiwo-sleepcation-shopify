document.addEventListener('alpine:init', () => {
  Alpine.data('xHighlightAnimation', () => ({
    initElements: null,
    animationFrameId: null,
    window_height: window.innerHeight,

    load(el, rtl_check, equalLines, fullScreen = false, range) {
      this.initElements = this.separateWords(el);
      this.partitionIntoLines(el, rtl_check, equalLines, fullScreen, range);

      let lastWidth = window.innerWidth;
      window.addEventListener("resize", this.debounce(() => {
        if (window.innerWidth !== lastWidth) {
          lastWidth = window.innerWidth;
          this.partitionIntoLines(el, rtl_check, equalLines, fullScreen, range);
        }
      }));
    },

    debounce(func, timeout = 300){
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
      };
    },

    separateWords(container) {
      let elements = [];
    
      container.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
          let words = node.textContent.match(/(\s+|[^\s-]+|[-])/g);
          words.forEach(word => {
            if (word) {
              let span = document.createElement("span");
              span.textContent = word;
              elements.push(span);  
            }
          });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "SPAN") {
            elements.push(...extractWordsAndImages(node));
          } else {
            elements.push(node);
          }
        }
      });

      return elements;
    },          

    partitionIntoLines(container, rtl_check, equalLines, fullScreen = false, range) {
      container.innerHTML = "";
      this.initElements.forEach(el => container.appendChild(el));
      let maxHeight = 0;
    
      requestAnimationFrame(() => {
        let lines = [];
        let currentLine = [];
        let prevMid = null;
    
        this.initElements.forEach((el) => {
          let rect = el.getBoundingClientRect();
          if (rect.width === 0) return;

          if (maxHeight < rect.height) {
            maxHeight = rect.height;
          }
          let midpoint = rect.bottom + (rect.top - rect.bottom) / 2;

          if (prevMid !== null && Math.abs(midpoint - prevMid) > 10) {
            lines.push(currentLine);
            currentLine = [];
          } 
          currentLine.push(el);
          prevMid = midpoint;
        });

        if (currentLine.length) {
          lines.push(currentLine);
        }

        let newInnerHTML = lines.map((lineElements) => {
          let div = document.createElement("div");
          if (equalLines) {
            div.className = "text-highlight relative inline-block text-transparent";
            div.style.height = `${maxHeight + 8}px`;
            div.style.lineHeight = `${maxHeight}px`;  
          } else {
            div.className = "text-highlight relative inline-block text-transparent mb-0.5";
          }
          lineElements.forEach(el => div.appendChild(el.cloneNode(true)));
          return div.outerHTML;
        }).join("");
      
        container.innerHTML = newInnerHTML;  
        container.setAttribute("x-intersect.once.margin.300px", "startAnim($el, " + rtl_check + ", " + fullScreen + ", " + range + ")");
      });
    },

    startAnim(el, rtl_check, fullScreen = false, range) {
      let starts = [];
      let ends = [];

      if (fullScreen) {
        let offsetStart = el.offsetParent.parentElement.getBoundingClientRect().top + window.scrollY;

        const offsets = { 3000: -200, 2000: 200 };
        let offset = offsets[range] ?? 600;
        
        el.childNodes.forEach((element, index) => {
          if (index != 0) {
            starts.push(ends[index - 1]);
            ends.push(starts[index] + range);
          } else {
            starts.push(offsetStart);
            ends.push(offsetStart + range)
          }
        });
        el.offsetParent.parentElement.style.height = `calc(${ends[ends.length - 1] - starts[0] + range / 2 + offset}px)`
      } else {
        starts = [0.7];
        ends = [0.5];
        
        el.childNodes.forEach((element, index) => {
          if (index != el.childNodes.length - 1) {
            const element_rect = element.getBoundingClientRect();
            const element_height = Math.abs(element_rect.bottom - element_rect.top) / this.window_height;
            let start = ends[index] + element_height;
            starts.push(start);
            ends.push(Math.max(start - 0.2, 0.2));
          }
        });
      }
      this.createObserver(el, rtl_check, starts, ends, fullScreen);
    },

    createObserver(el, rtl_check, starts, ends, fullScreen = false) {
      const option = {
        root: null,
        rootMargin: '300px',
        threshold: 0
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.updateHighlight(el, rtl_check, starts, ends, fullScreen);
          } else {
            if (this.animationFrameId) {
              cancelAnimationFrame(this.animationFrameId);
              this.animationFrameId = null;
            }
          }
        });
      }, option);

      observer.observe(el);
    },
    
    updateHighlight(el, rtl_check = false, starts, ends, fullScreen = false) {
      const update = () => {
        el.childNodes.forEach((element, index) => {
          let value;
          const element_rect = element.getBoundingClientRect();
          let position = fullScreen ? window.scrollY : Math.max(Math.min((element_rect.top / this.window_height), 1), 0);

          if (fullScreen) {
            if (position < starts[index]) {
              value = 0;
            } else if (position > ends[index]) {
              value = 100;
            } else {
              value = 100 * (position - starts[index]) / (ends[index] - starts[index]);
            }
          } else {
            if (position > starts[index]) {
              value = 0;
            } else if (position < ends[index]) {
              value = 100;
            } else {
              value = 100 * (position - starts[index]) / (ends[index] - starts[index]);
            }
          }

          element.style.backgroundPositionX = `${rtl_check ? '' : '-'}${value}%`;
        });
        
        this.animationFrameId = window.requestAnimationFrame(update);
      }

      if (!this.animationFrameId) {
        update();
      }
    }
  }));
  Alpine.data("xMap", (data) => ({
    load() {
      this.$el.querySelector(
        "iframe"
      ).src = `https://maps.google.com/maps?q=${data}&t=m&z=17&ie=UTF8&output=embed&iwloc=near`;
    },
    loadMap(location) {
      this.$el.querySelector(
        "iframe"
      ).src = `https://maps.google.com/maps?q=${location}&t=m&z=17&ie=UTF8&output=embed&iwloc=near`;
    },
    removeMap() {
      this.$el.querySelector(
        "iframe"
      ).src = ``;
    } 
  }));

  Alpine.data("xMultipleStores", () => ({
    active: 1,
    open: false,
    canScroll: false,
    atTop: true,
    atBottom: false,
    showStore: false,
    load() {
      const canScrollVertically = this.$refs.list_stores.scrollHeight > this.$refs.list_stores.closest(".multi_stores_content").clientHeight;
      if (canScrollVertically) {
        this.canScroll = true;
      }
      window.addEventListener('resize', ()=> {
        this.heightNatural();
      })
      this.heightNatural();
    },
    heightNatural() {
      if (window.matchMedia("(min-width: 768px)").matches) {
        if(this.$refs.natural_height) {
           this.$refs.natural_height.style.height = this.$refs.h_img_location.offsetHeight +'px';
        }
      } else {
        if(this.$refs.natural_height) {
          this.$refs.natural_height.style.removeProperty('height');
        }
      }
    },
    openLocation(el) {
      this.open = true;
      var popupContent = document.getElementById(el.getAttribute("data-id"));
      
      this.$refs.content_location_detail.innerHTML = popupContent.innerHTML;
      const title = this.$refs.content_location_detail.querySelector('h5.location-title');
      if (title) {
        const h4 = document.createElement('h4');

        h4.innerHTML = title.innerHTML;
        h4.className = title.className;

        title.replaceWith(h4);
      }
    },
    hideLocation() {
      requestAnimationFrame(() => {
        this.open = false;
        Alpine.store('xPopup').open = false;
      });
    },
    scrollUp() {
      this.$refs.list_stores.scrollBy({
        top: -200, 
        behavior: 'auto'
      });
      this.checkCanScrollVertical()
    },
    scrollDown() {
      this.$refs.list_stores.scrollBy({
        top: 200,
        behavior: 'auto'
      });
      this.checkCanScrollVertical()
    },
    checkCanScrollVertical() {
      if (window.innerWidth < 768) {
        this.atTop = this.$refs.list_stores.scrollTop === 0;
        this.atBottom = (this.$refs.list_stores.scrollTop + this.$refs.list_stores.closest(".multi_stores_content").clientHeight) >= (this.$refs.list_stores.scrollHeight - 2);
      }
    },
    toggleStore(noScroll = false) {
      this.showStore = !this.showStore;
      if (!this.showStore) {
        this.$refs.first_store.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (!noScroll) {
        this.canScroll = !this.canScroll;
        this.$refs.list_stores.addEventListener("animationend", this.checkCanScrollVertical());
        setTimeout(() => {
          this.$refs.list_stores.removeEventListener("animationend", this.checkCanScrollVertical());
        }, 300);
      }
    }
  }));
  
  Alpine.data('xFeaturedCollection', (sectionId, pageParam, container) => ({
    sectionId: sectionId,
    pageParam: pageParam,
    currentTab: 1,
    loading: true,
    loaded: [],
    select(index) {
      this.currentTab = index;
      if (Shopify.designMode) {
        this.currentTab = index - 1;
        const content = document.createElement('div');
        const template = container.querySelector(`#x-fc-${sectionId}-${index}`);
        if (template) {
          content.appendChild(template.content.firstElementChild.cloneNode(true));
          container.appendChild(content.querySelector('.x-fc-content'));
          template.remove();
        }
        
        this.loading = false;
      }
    },
    loadData(index) {
      const selectedPage = index - 1;
      if (!this.loaded.includes(selectedPage)) {
        this.loading = true;
        
        let url = `${window.location.pathname}?section_id=${this.sectionId}&${this.pageParam}=${index}`;
        fetch(url, {
          method: 'GET'
        }).then(
          response => response.text()
        ).then(responseText => {
          const html = (new DOMParser()).parseFromString(responseText, 'text/html');
          const contentId = `x-fc-${this.sectionId}-${index}`;
          if (Shopify.designMode && document.getElementById(contentId)) {
            document.getElementById(contentId).remove();
          }
          const newContent = html.getElementById(contentId);
          if (newContent && !document.getElementById(contentId)) {
            container.appendChild(newContent);
            this.loaded.push(selectedPage);
          }
          this.loading = false;
        })
      }
    },
    scrollIntoView(element) {
      const scrollableContainer = element.closest('.overflow-x-auto'); 
      const elementPosition = element.offsetLeft;

      scrollableContainer.scroll({
        left: elementPosition,
        behavior: 'smooth'
      });
    }
  }));

  Alpine.data('xLocalizationForm', () => ({ 
    openCountry: false,
    loading: false,
    cachedResults: false,
    submit(value, input) {
      this.$el.closest("#localization_form").querySelector('#'+input).value = value;
      this.$el.closest("#localization_form").submit();
    },
    loadCountry(el) {
      if (this.cachedResults) {
        this.openCountry = true;
        return true
      }
      let countrySelector = el.closest(".country-selector");
      let optionEL = countrySelector.querySelector(".country-options");

      this.loading = true;
      fetch(window.Shopify.routes.root + '?section_id=country-selector')
      .then(reponse => {
        return reponse.text();
      })
      .then((response) => {
        const parser = new DOMParser();
        const content = parser.parseFromString(response,'text/html').getElementById("list-country").innerHTML;
        optionEL.innerHTML = content;
        this.cachedResults = true;
        this.openCountry = true;
      })
      .finally(() => {
        this.loading = false;
      })
    },
  }));
Alpine.store('xCartShare', {
    openShareCart: false,
    cartShareUrl: "",
    shared: false,
    copySuccess: false,
    generateUrl() {
      fetch(Shopify.routes.root + 'cart.js', {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
      })
      .then(response => response.json())
      .then(response => {
        const items = response.items.slice().reverse();
        const cartParams = items.map(item => `id:${item.variant_id},q:${item.quantity}`).join('&') + '&share_cart:true';
        this.cartShareUrl = `${window.location.origin}?${cartParams}`;
      });
    },
    copyURL() {
      const cartShareInput = document.getElementById(`x-share-cart-field`);
      if (cartShareInput) {
        navigator.clipboard.writeText(cartShareInput.value).then(
          () => {
            this.copySuccess = true;
            setTimeout(() => {
              this.copySuccess = false;
            }, 2000);
          },
          () => {
            alert('Copy fail');
          }
        );
      }
    },
    handleShareCart() {
      const queryString = window.location.search;
      if (queryString.includes("share_cart:true")) {
        const items = queryString
          .substring(1)
          .split('&')
          .reduce((listItem, param) => {
              if (param.startsWith('id:')) {
                const [idPart, quantityPart] = param.split(',');
                const id = parseInt(idPart.slice(3)); 
                const quantity = parseInt(quantityPart.slice(2));
                listItem.push({ id, quantity });
              }
              return listItem;
          }, []);
        if (items.length > 0) {
          this.addCartItems(items);
        }
      }
    },
    addCartItems(items) {
      const sectionsToRender = this.getSectionsToRender();
      
      const sections = sectionsToRender.map((s) => s.id);
      
      const formData = {
        'items': items,
        'sections': sections
      }
      
      fetch(Shopify.routes.root + "cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(formData)
      }).then(response => response.json())
        .then(response => {
          sectionsToRender.forEach((section => {
            const sectionElement = document.querySelector(section.selector);
            if (sectionElement) {
              if (response.sections[section.id])
                sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
            }
            Alpine.store('xMiniCart').openCart();
            Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
            document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));
          }));
          this.shared = true;
        })
        .catch(error => {
          console.error(error);
        });
    }
  });
  
  Alpine.store('xShopifyPaymentBtn', {
    load(e) {
      if (Shopify && Shopify.PaymentButton) {
        Shopify.PaymentButton.init();
      }
    },
  });

  Alpine.data('xPopups', (data) => ({
    enable: false,
    showMinimal: false,
    show: Shopify.designMode ? ( localStorage.getItem(data.name + '-' + data.sectionId)? xParseJSON(localStorage.getItem(data.name + '-' + data.sectionId)) : true ) : false,
    delayDays: data.delayDays ? data.delayDays : 0,
    t: '',
    copySuccess: false,
    init() {
      if (Shopify.designMode) {
        var _this = this;
        const handlePopupSelect = (event, isResize = null) => {
          if (event.detail && event.detail.sectionId.includes(data.sectionId) || isResize) {
            if (window.Alpine) {
              _this.open();
              localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(true));
            } else {
              document.addEventListener('alpine:initialized', () => {
                _this.open();
                localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(true));
              });
            }
          } else {
            if (window.Alpine) {
              _this.closeSection();
              localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
            } else {
              document.addEventListener('alpine:initialized', () => {
                _this.closeSection();
                localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
              });
            }
          }
        }

        document.addEventListener('shopify:section:select', (event) => {
          handlePopupSelect(event);
        });

        document.addEventListener('shopify:block:select', (event) => {
          handlePopupSelect(event);
        });

        // Reload the popup and display the overlay when change screen in Shopify admin
        if (data.name != 'popup-age-verification') {
          window.addEventListener('resize', (event)=> {
            handlePopupSelect(event, xParseJSON(localStorage.getItem(data.name + '-' + data.sectionId)));
          })
        }
      }

      localStorage.setItem('promotion-popup', '[]');

      if (this.$el.querySelector('.newsletter-message')) {
        this.open();
        return;
      }

      this.$watch('show', (value) => {
        if (!value) {
          this.close();
        }
      });
    },
    load(sectionId) {
      // Optimize the JavaScript for popup loading.
      if (window.location.pathname === '/challenge') return;

      const _this= this;
      if (Shopify.designMode) {
        _this.open();
      } else {
        if (data.name == 'popup-promotion' && !this.handleSchedule() && data.showCountdown) return;

        if (data.name == 'popup-promotion' && document.querySelector(`#x-age-popup-${sectionId}`) && xParseJSON(localStorage.getItem('popup-age-verification')) == null) {
          document.addEventListener("close-age-verification", () => {
            this.triggerIntent();
            if (data.trigger_intent == 'delay') {
              setTimeout(() => {
                _this.open();
              }, data.delays * 1000);
            }
          })
          return;
        }
        
        this.triggerIntent();
      }
    },
    open() {
      if (!Shopify.designMode && this.isExpireSave() && !this.show) return;

      var _this = this;
      if (data.name == 'popup-age-verification') {
        if (this.isExpireSave() && !Shopify.designMode && !data.show_popup) return;

        requestAnimationFrame(() => {
          document.body.classList.add("overflow-hidden");
          Alpine.store('xPopup').open = true;
        });
      }

      // Show minimal popup when
      // 1. "Show minimal" is enabled for desktop, default style is set to "minimal", and the window width is >= 768
      // 2. "Show minimal" is enabled for mobile, default mobile style is set to "minimal", and the window width is < 768
      if ((data.showMinimal && data.default_style == "minimal" && window.innerWidth >= 768) 
        || (data.showMinimalMobile && data.default_style_mobile == "minimal" && window.innerWidth < 768)) {
        _this.showMinimal = true;
        _this.show = false;
        if (Shopify.designMode) {
          localStorage.setItem(data.name + '-' + data.sectionId, JSON.stringify(false));
          _this.removeOverlay();
        }
      } else {
        // Show full popup
        if (data.showOnMobile && window.innerWidth < 768 || window.innerWidth >= 768) {
          // Show a full popup the first time a customer accesses the site. If the customer closes the full popup, display a minimal popup for the rest of the session.
          if (localStorage.getItem('current-' + data.sectionId) == 'minimal') {
            _this.showMinimal = true;
            _this.show = false;
            _this.removeOverlay();
          } else {
            _this.show = true;
            _this.showMinimal = false;
            _this.setOverlay();
            if (!Shopify.designMode) {
              _this.saveDisplayedPopup();
            }
          }
        } else {
          // Show nothing when screen width is < 768 and "Show popup on mobile" is disabled.
          _this.removeOverlay();
        }
      }
    },
    close() {
      if (data.name == 'popup-age-verification') {
        this.show = false;
        requestAnimationFrame(() => {
          document.body.classList.remove("overflow-hidden");
          Alpine.store('xPopup').close();
        });
        document.dispatchEvent(new Event('close-age-verification'));
        if (!this.isExpireSave()) {
          this.setExpire()
        }
        this.removeDisplayedPopup();
        return;
      }
      var _this = this;
      if (Shopify.designMode) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            _this.showMinimal = true;
          }, 300);
        });
      } else {
        this.removeDisplayedPopup();
        if ((data.showMinimal && window.innerWidth >= 768) || (data.showMinimalMobile && window.innerWidth < 768)) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              _this.showMinimal = true;
            }, 300);
            // Save data to storage when the full popup is closed (the full popup only shows on the first access to the site)
            localStorage.setItem('current-' + data.sectionId, 'minimal');
          });
        } else {
          if (!this.isExpireSave()) {
            this.setExpire()
          }
        }
      }
      requestAnimationFrame(() => {
        setTimeout(() => {
          _this.show = false;
          _this.removeOverlay();
        }, 300);
      });
    },
    triggerIntent() {     
      var _this = this;
      switch (data.trigger_intent) {
        case "exit":
          document.addEventListener('mouseleave', (event) => {
            if (event.clientY <= 0 || event.clientX <= 0 || event.clientY >= window.innerHeight || event.clientX >= window.innerWidth) {
              _this.open();
            }
          });
          break;
        case "copy_to_clipboard":
          document.addEventListener('copy', () => {
            _this.open();
          });
          break;
        case "scroll":
          window.addEventListener('scroll', () => {
            const scrollPosition = window.scrollY + window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            if (scrollPosition >= documentHeight * data.scroll_height) { // Enable when scroll to scroll_height percent page
              _this.open();
            }
          });
          break;
        default:
          setTimeout(() => {
            _this.open();
          }, data.delays * 1000);
      }
    },
    closeSection() {
      this.show = false;
      this.showMinimal = false;
      this.removeOverlay();
    },
    setExpire() {
      const item = {
        section: data.sectionId,
        expires: Date.now() + this.delayDays * 24 * 60 * 60 * 1000
      }
      
      localStorage.setItem(data.sectionId, JSON.stringify(item))
      // Remove storage data so that the full popup will be displayed again when the reappear rule is applied on the site.
      localStorage.removeItem('current-' + data.sectionId);
      setTimeout(()=>{
        this.saveDisplayedPopup();
        this.show = true;
      }, item.expires - Date.now())
    },

    isExpireSave() {
      const item = xParseJSON(localStorage.getItem(data.sectionId));
      if (item == null) return false;

      if (Date.now() > item.expires) {
        localStorage.removeItem(data.sectionId);
        return false;
      }

      return true;
    },
    handleSchedule() {
      if (data.showCountdown) {
        let el = document.getElementById('x-promotion-' + data.sectionId);
        let settings = xParseJSON(el.getAttribute('x-countdown-data'));
        if (!Alpine.store('xHelper').canShow(settings)) {
          if (!Shopify.designMode && data.schedule_enabled) {
            requestAnimationFrame(() => {
              this.show = false;
            });

            return false;
          }
        }
      }

      this.enable = true;
      return true;
    },
    clickMinimal() {
      requestAnimationFrame(() => {
        this.show = true;
        this.showMinimal = false;
        if (!Shopify.designMode) {
          this.saveDisplayedPopup()
        }
        this.setOverlay();
      })
    },
    setOverlay() {
      let popupsDiv = document.querySelector("#eurus-popup");
      if (popupsDiv.classList.contains('bg-[#acacac]')) return
      if (data.overlay) {
        popupsDiv.className += ' bg-[#acacac] bg-opacity-30';
      }
    },
    removeOverlay() {
      let popupsDiv = document.querySelector("#eurus-popup")
        displayedPopups = xParseJSON(localStorage.getItem("promotion-popup")) || [];
      if (popupsDiv.classList.contains('bg-[#acacac]') && displayedPopups.length == 0) {
        popupsDiv.classList.remove('bg-[#acacac]', 'bg-opacity-30');
      }
    },
    // Closing the minimal popup will set it as expired.
    closeMinimal() {
      this.showMinimal = false;
      if (Shopify.designMode) return

      if (!this.isExpireSave()) this.setExpire();
    },
    saveDisplayedPopup() {
      let localStorageArray = xParseJSON(localStorage.getItem('promotion-popup')) || [];
      if (!localStorageArray.some(item => item == data.name + '-' + data.sectionId)) {
        localStorageArray.push(data.name + '-' + data.sectionId);
        localStorage.setItem('promotion-popup', JSON.stringify(localStorageArray));
      }
    },
    removeDisplayedPopup() {
      let localStorageArray = xParseJSON(localStorage.getItem('promotion-popup')),
        updatedArray = localStorageArray.filter(item => item != data.name + '-' + data.sectionId);
      localStorage.setItem('promotion-popup', JSON.stringify(updatedArray));
    },
  }));

  Alpine.data('xProductCart', (
    wrappringVariantId,
    engravingVariantId,
  ) => ({
    loading: false,
    errorMessage: false,
    mainHasError: false,
    buttonSubmit: "",
    error_message_wrapper: {},
    stopAction: false,
    insuranceVariantId: '',
    loadInsurance(id) {
      if (this.insuranceVariantId == '') {
        this.insuranceVariantId = id;
      }
    },
    scrollToAtcBtn(btnId) {
      const originalAtcBtn = document.querySelector(`#${btnId}`);
      originalAtcBtn.scrollIntoView({
        behavior: "smooth",
        block: 'center',
        inline: 'center'
      })
    },
    async hashProperties(formData) {
      let result = [];
      for (let [key, value] of formData.entries()) {
        const match = key.match(/^properties\[(.+)\]$/);
        if (match) {
          if (value instanceof File) {
            result.push(`${value.name}:${value.size}:${value.type}`);
          } else {
            result.push(value);
          }
        }
      }
      result.push(formData.get('id'));
      result.sort();

      let data = result.join('|');

      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex;
    },
    async addToCart(e, required, quickView, sticky) {
      this.loading = true;
      e.preventDefault();

      setTimeout(async () => {
        if (required) {
          var productInfo = this.$el.closest('.product-info');
          if(sticky){
            productInfo = document.querySelector('.product-info');
          }
          if (productInfo) {
            var propertiesInput = productInfo.querySelectorAll(`.customization-picker`);
            this.stopAction = false;
            let scrollStatus = false;
            
            propertiesInput.length && propertiesInput.forEach((input) => {
              if (input.required && input.value.trim() == '' || input.classList.contains("validate-checkbox")) {
                input.classList.add("required-picker");
                this.stopAction = true;
                if(!scrollStatus){
                  input.parentElement.querySelector('.text-required').scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                  });
                  scrollStatus = true;
                }    
              }                
            });              
          }
          if (this.stopAction) {
            setTimeout (() => {
              this.loading = false;
            }, 500);
            return true;
          }
        }

        if (this.$refs.engraving_text && engravingVariantId) {
          if (this.$refs.engraving_text.value.trim()) {
            if (!this.$refs.engraving_text.hasAttribute('name')) this.$refs.engraving_text.setAttribute('name', this.$refs.text_area_name.value);
          } else {
            if (this.$refs.engraving_text.hasAttribute('name')) this.$refs.engraving_text.removeAttribute('name');
          }
        }

        var productForm = this.$el.closest('.product-info') || this.$el.closest('form');
        var edt_element = productForm ? productForm.querySelector('.hidden.cart-edt-properties') : null;
        if (edt_element) {
          edt_element.value = edt_element.value.replace("time_to_cut_off", Alpine.store('xEstimateDelivery').noti)
        }
        let formData = new FormData(this.$refs.product_form);

        if (this.$refs.gift_wrapping_checkbox && this.$refs.gift_wrapping_checkbox.checked && wrappringVariantId && this.$refs.gift_wrapping_id) {              
          await this.hashProperties(formData).then(hashHex => {
            this.$refs.gift_wrapping_id.value = hashHex;
            formData = new FormData(this.$refs.product_form);
          });
        }

        formData.append(
          'sections',
          Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id)
        );
        formData.append('sections_url', window.location.pathname);
        await fetch(`${Eurus.cart_add_url}`, {
          method:'POST',
          headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
          body: formData
        }).then(reponse => {
          return reponse.json();
        }).then(async (response) => {
          if (response.status == '422') {
            if (typeof response.errors == 'object') {
              this.error_message_wrapper = response.errors;
              document.querySelector('.recipient-error-message').classList.remove('hidden');
            } else {
              this.errorMessage = true;
              setTimeout(() => {
                this.errorMessage = false;
              }, 3000);
              if(this.$refs.error_message){
                this.$refs.error_message.textContent = response.description;
              }
              if(this.$refs.error_message_mobile){
                this.$refs.error_message_mobile.textContent = response.description;
              }
            }
            if (Alpine.store('xMiniCart')) {
              Alpine.store('xMiniCart').reLoad();
            }
          } else {  
            if (Alpine.store('xCartNoti') && Alpine.store('xCartNoti').enable) {
              Alpine.store('xCartNoti').setItem(response); 
            }
            let match = document.cookie.match('(^|;)\\s*' + 'eurus_insurance' + '\\s*=\\s*([^;]+)');
            if (
              (this.$refs.gift_wrapping_checkbox && this.$refs.gift_wrapping_checkbox.checked && wrappringVariantId) || 
              (this.$refs.engraving_text && engravingVariantId && this.$refs.engraving_text.value.trim()) || 
              (this.insuranceVariantId && !localStorage.getItem('insuranceRemoved') && (!match || match[1].trim() === ''))
            ) {
              let additionalOptionData = {
                items: [],
                sections:  Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id)
              };
              if (this.$refs.gift_wrapping_checkbox && this.$refs.gift_wrapping_checkbox.checked && wrappringVariantId && response.properties['_gift_wrapping_id']) {
                additionalOptionData.items.push(
                  {
                    id: wrappringVariantId,
                    quantity: 1,
                    properties: {
                      "For": response.title,
                      "_key_link": response.properties['_gift_wrapping_id']
                    }
                  }
                );
              }
              if (this.$refs.engraving_text && engravingVariantId && this.$refs.engraving_text.value.trim()) {
                additionalOptionData.items.push(
                  {
                    id: engravingVariantId,
                    quantity: 1
                  }
                );
              }
              if (this.insuranceVariantId && !localStorage.getItem('insuranceRemoved')) {
                let match = document.cookie.match('(^|;)\\s*' + 'eurus_insurance' + '\\s*=\\s*([^;]+)');
                if (!match || match[1].trim() === '') {
                  additionalOptionData.items.push(
                    {
                      id: this.insuranceVariantId,
                      quantity: 1
                    }
                  );
                }
              }

              if (additionalOptionData.items.length !== 0) {
                await window.fetch('/cart/add.js', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                  },
                  body: JSON.stringify(additionalOptionData),
                }).then((response) => {
                  return response.json();
                }).then(response => {
                  document.querySelector('.recipient-error-message') ? document.querySelector('.recipient-error-message').classList.add('hidden') : '';
                  this.error_message_wrapper = {};
    
                  if (Alpine.store('xQuickView') && Alpine.store('xQuickView').show) {
                    Alpine.store('xQuickView').show = false;
                  }
                  Alpine.store('xPopup').close();
                  
                  if((quickView && Alpine.store('xQuickView').buttonQuickView && Alpine.store('xQuickView').buttonQuickView.dataset.addAsBundle) || (!quickView && this.$refs.product_form && this.$refs.product_form.querySelector('[data-add-as-bundle="true"]'))) {
                    document.dispatchEvent(new CustomEvent("eurus:cart:add-as-bundle"));
                  } else {
                    Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
                      const sectionElement = document.querySelector(section.selector);
                      if (sectionElement) {
                        if (response.sections[section.id])
                          sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
                      }
                    }));
                    if (!Alpine.store('xCartNoti') || !Alpine.store('xCartNoti').enable) {
                      setTimeout(() => {
                        Alpine.store('xMiniCart').openCart();
                      }, 500);
                      document.dispatchEvent(new CustomEvent("eurus:cart:redirect"));  
                    }  
                    Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
                    document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));
                  }
                });  
              }
            } else {
              document.querySelector('.recipient-error-message') ? document.querySelector('.recipient-error-message').classList.add('hidden') : '';
              this.error_message_wrapper = {};
    
              if (Alpine.store('xQuickView') && Alpine.store('xQuickView').show) {
                Alpine.store('xQuickView').show = false;
              }
              Alpine.store('xPopup').close();
              
              if((quickView && Alpine.store('xQuickView').buttonQuickView && Alpine.store('xQuickView').buttonQuickView.dataset.addAsBundle) || (!quickView && this.$refs.product_form && this.$refs.product_form.querySelector('[data-add-as-bundle="true"]'))) {
                document.dispatchEvent(new CustomEvent("eurus:cart:add-as-bundle"));
              } else {
                Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
                  const sectionElement = document.querySelector(section.selector);
                  if (sectionElement) {
                    if (response.sections[section.id])
                      sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
                  }
                }));
                if (!Alpine.store('xCartNoti') || !Alpine.store('xCartNoti').enable) {
                  Alpine.store('xMiniCart').openCart();
                }               
                Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
                document.dispatchEvent(new CustomEvent("eurus:cart:items-changed"));
                document.dispatchEvent(new CustomEvent("eurus:cart:redirect"));
              }
            }
          }
        }).catch((error) => {
          console.error('Error:', error);
        }).finally(() => {
          this.loading = false;
          if ((quickView && Alpine.store('xQuickView').buttonQuickView && !Alpine.store('xQuickView').buttonQuickView.dataset.addAsBundle) || (!quickView && this.$refs.product_form && !this.$refs.product_form.querySelector('[data-add-as-bundle="true"]'))) {
            if(this.$refs.gift_wrapping_checkbox) this.$refs.gift_wrapping_checkbox.checked = false;
            if(this.$refs.gift_wrapping_id) this.$refs.gift_wrapping_id.value = '';
          }
          document.cookie = `eurus_insurance=${this.insuranceVariantId}; path=/`;  
        })
      }, 0)
    }
  }));

  Alpine.data('xProductMedia', (settings) => ({
    thumbnailOnMouseDown: false,
    thumbnailOfset: 0,
    thumbnailScrollOfset: 0,
    thumbnailGrabbingClass: '',
    zoomIsOpen: false,
    productMediaIsOpen: '',
    videoExternalListened: false,
    xPosition: 0,
    yPosition: 0,
    imageWidth: 0,
    imageHeight: 0,
    startZoom(event) {
      const elem = event.currentTarget;
      const size = elem.getBoundingClientRect();
      this.xOffset = size.left;
      this.yOffset = size.top;
      this.imageWidth = size.width;
      this.imageHeight = size.height;
    },
    updatePosition(event) {
      if (this.imageWidth && this.imageHeight) {
        this.xPosition = ((event.clientX - this.xOffset) / this.imageWidth) * 100;
        this.yPosition = ((event.clientY - this.yOffset)  / this.imageHeight) * 100;
      }
    },
    thumbnailHandleMouseDown(e) {
      this.thumbnailOnMouseDown = true;
      this.thumbnailGrabbingClass = 'cursor-grabbing';
      if (settings.thumbnail_direction == 'horizontal') {
        this.thumbnailOfset = e.pageX - this.$refs.thumbnail.offsetLeft;
        this.thumbnailScrollOfset = this.$refs.thumbnail.scrollLeft;
      } else {
        this.thumbnailOfset = e.pageY - this.$refs.thumbnail.offsetTop;
        this.thumbnailScrollOfset = this.$refs.thumbnail.scrollTop;
      }
    },
    thumbnailHandleMouseMove(e) {
      if(!this.thumbnailOnMouseDown) return;
      e.preventDefault();
      if (settings.thumbnail_direction == 'horizontal') {
        const x = e.pageX - this.$refs.thumbnail.offsetLeft;
        const walk = (x - this.thumbnailOfset) * 2; 
        this.$refs.thumbnail.scrollLeft = this.thumbnailScrollOfset - walk;
      }
      else {
        const y = e.pageY - this.$refs.thumbnail.offsetTop;
        const walk = (y - this.thumbnailOfset) * 2; 
        this.$refs.thumbnail.scrollTop = this.thumbnailScrollOfset - walk;
      }
    },
    thumbnailHandleMouseLeave() {
      this._thumbnailRemoveGrabing();
    },
    thumbnailHandleMouseUp() {
      this._thumbnailRemoveGrabing();
    },
    _thumbnailRemoveGrabing() {
      this.thumbnailOnMouseDown = false;
      this.thumbnailGrabbingClass = 'md:cursor-grab';
    },
    zoomOpen(position, isSplide) {
      this.zoomIsOpen = true;
      Alpine.store('xPopup').open = true;
      setTimeout(() => {
        if (isSplide) {
          const splideEl = document.getElementById(`media-gallery-${settings.section_id}`)
          if (splideEl && splideEl.splide) {
            let nextSlideIndex = 0;
            const childrenArray = Array.from(splideEl.querySelector('.splide__list').children)
            childrenArray.map((item, index) => {
              if (item.getAttribute('x-slide-index') == position) {
                nextSlideIndex = index
              }
            })
            splideEl.splide.go(nextSlideIndex);
          }
          document.addEventListener(`eurus:zoom-image-ready:${settings.section_id}`, () => {
            if (splideEl && splideEl.splide) {
              let nextSlideIndex = 0;
              const childrenArray = Array.from(splideEl.querySelector('.splide__list').children)
              childrenArray.map((item, index) => {
                if (item.getAttribute('x-slide-index') == position) {
                  nextSlideIndex = index
                }
              })
              splideEl.splide.go(nextSlideIndex);
            }
          });
        }
        else {
          document.getElementById(position + '-image-zoom-' + settings.section_id).scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 200);
      Alpine.store('xModal').activeElement = 'product-image-' + settings.section_id + '-' + position;
    },
    zoomClose() {
      this.zoomIsOpen = false;
      Alpine.store('xPopup').close();
    },
    
    videoHandleIntersect() {
      if (settings.video_autoplay) {
        Alpine.store('xVideo').play(this.$el);
      }
    },
    productModelInit() {
      window.Shopify.loadFeatures([
        {
          name: 'shopify-xr',
          version: '1.0',
          onLoad: this._productModelSetupShopifyXR,
        },
      ]);
    },
    _productModelSetupShopifyXR() {
      const setup = () => {
        document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
          window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
          modelJSON.remove();
        });
        window.ShopifyXR.setupXRElements();
      }

      if (!window.ShopifyXR) {
        document.addEventListener('shopify_xr_initialized', () => {
          setup();
        });
        return;
      }
  
      setup();
    },
    productModelLoadMedia() {
      let container = this.$el.parentNode;
      const content = document.createElement('div');
      content.appendChild(container.querySelector('template').content.firstElementChild.cloneNode(true));

      this.$el.classList.add('hidden');
      container.appendChild(content.querySelector('model-viewer'));

      this._productModelLoadViewerUI();
    },
    productModelPauseViewer() {
      if (this.$el.modelViewerUI) this.$el.modelViewerUI.pause();
    },
    _productModelLoadViewerUI() {
      window.Shopify.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: this._productModelSetupViewerUI.bind(this),
        },
      ]);
    },
    _productModelSetupViewerUI(errors) {
      if (errors) return;

      this.$el.parentNode.modelViewerUI
        = new Shopify.ModelViewerUI(this.$el.parentNode.querySelector('model-viewer')); 
    }
  }));

  Alpine.store('xProductRecommendations', {
    loading: false,
    listOfUpsellProducts: [],
    el: '',
    listUpsellId: [],
    productCount: 0,
    async loadUpsell(el, url, listId, limit, maxItems) {
      this.el = el;
      this.loading = true;
      this.listOfUpsellProducts = [];
      this.productCount = 0;
      this.listUpsellId = [];         
      for (let i = 0; i < listId.length; i++) {
        if (this.productCount >= maxItems) {
          break;
        }    
        try {
          const response = await fetch(`${url}&product_id=${listId[i]}&limit=${limit}&intent=related`);
          const text = await response.text();
          const html = document.createElement('div');
          html.innerHTML = text;
          const des = document.querySelector('.cart-upsell-carousel');
          const src = html.querySelector('.cart-upsell-carousel')
          if(src && des) des.innerHTML = src.innerHTML
          const recommendations = html.querySelector('.product-recommendations');
  
          if (recommendations && recommendations.innerHTML.trim().length) {
            const newUpsellProducts = recommendations.querySelectorAll('template[x-teleport="#cart-upsell-drawer"], template[x-teleport="#cart-upsell"]');
            this.listOfUpsellProducts = [...newUpsellProducts, ...this.listOfUpsellProducts];
  
            for (let index = 0; index < this.listOfUpsellProducts.length; index++) {
              if (this.productCount >= maxItems) {
                break;
              }
              
              const element = this.listOfUpsellProducts[index];
              const elementId = new DOMParser().parseFromString(element.innerHTML, 'text/html').querySelector('.hover-text-link, .link-product-variant').id;
              
              if (!this.listUpsellId.includes(elementId)) {
                this.listUpsellId.push(elementId);
                el.appendChild(element);
                this.productCount++;
              }
            }
  
            if (recommendations.classList.contains('main-product')) {
              el.className += ' mb-5 border-y border-solid accordion empty:border-b-0';
            }
          } else if (recommendations && recommendations.classList.contains('main-product')) {
            recommendations.classList.add("hidden");
            el.innerHTML = recommendations.innerHTML;
          }
        } catch (e) {
          console.error(e);
        } finally {
          this.loading = false;
        }
      }
    },
    load(el, url) {
      this.loading = true;
      fetch(url)
        .then(response => response.text())
        .then(text => {
          const html = document.createElement('div');
          html.innerHTML = text;
          const recommendations = html.querySelector('.product-recommendations');
          if (recommendations && recommendations.innerHTML.trim().length) {
            requestAnimationFrame(() => {
              el.innerHTML = recommendations.innerHTML;
            });
            if (recommendations.classList.contains('main-product')) {
              el.className += ' mb-5 border-y border-solid accordion empty:border-b-0';
            }
          } else if (recommendations.classList.contains('main-product')) {
            recommendations.classList.add("hidden");
            el.innerHTML = recommendations.innerHTML;
          }
        })
        .finally(() => {
          this.loading = false;
        }) 
        .catch(e => {
          console.error(e);
        });
    }
  });

  Alpine.store('xProductRecently', {
    show: false,
    productsToShow: 0,
    productsToShowMax: 10,
    init() {
      if (document.getElementById('shopify-section-recently-viewed')) {
        this.productsToShow = document.getElementById('shopify-section-recently-viewed').getAttribute("x-products-to-show");
      }
    },
    showProductRecently() {
      if (localStorage.getItem("recently-viewed")?.length) {
        this.show = true;
      } else {
        this.show = false;
      }
    },
    setProduct(productViewed) {
      let productList = [];
      if (localStorage.getItem("recently-viewed")?.length) {
        productList = JSON.parse(localStorage.getItem("recently-viewed")); 
        productList = [...productList.filter(p => p !== productViewed)].filter((p, i) => i<this.productsToShowMax);
        this.show = true;
        let newData = [productViewed, ...productList];
        localStorage.setItem('recently-viewed', JSON.stringify(newData))
      } else {
        this.show = false;
        localStorage.setItem('recently-viewed', JSON.stringify([productViewed]));
      }
    },
    getProductRecently(sectionId, productId) {
      let products = [];
      if (localStorage.getItem("recently-viewed")?.length) {
        products = JSON.parse(localStorage.getItem("recently-viewed"));
        products = productId ? [...products.filter(p => p !== productId)] : products;
        products = products.slice(0,this.productsToShow);
      } else {
        return;
      }
      const el = document.getElementById("shopify-section-recently-viewed");
      let query = products.map(value => "id:" + value).join(' OR ');
      var search_url = `${Shopify.routes.root}search?section_id=${ sectionId }&type=product&q=${query}`;
      fetch(search_url).then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          console.log(error)
          throw error;
        }

        return response.text();
      })
      .then((text) => {
        const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-recently-viewed').innerHTML;
        el.innerHTML = resultsMarkup;
      })
      .catch((error) => {
        throw error;
      });
    },
    clearStory() {
      var result = confirm('Are you sure you want to clear your recently viewed products?');
      if (result === true) {
        localStorage.removeItem("recently-viewed");
        this.show = false;
      }
    }
  });

  
  Alpine.data('xVariantSelect', (
      element,
      sectionId,
      isProductPage,
      unavailableText,
      productUrl,
      productId,
      showFirstImageAvaiable,
      chooseOption,
      productBundle,
      handleSectionId,
      firstAvailableVariantId,
      pageParam,
      productFeaturedImage,
      quickAddPageParam,
      updateImage
    ) => ({
      variants: null,
      currentVariant: {},
      options: [],
      currentAvailableOptions: [],
      cachedResults: [],
      quickViewSectionId: 'quick-view',
      handleSectionId: sectionId,
      paramVariant: false,
      mediaGallerySource: [],
      isChange: false,
      optionConnects: [],
      mediaOption: "",
      handleSticky: '',
      initfirstMedia: false,
      initialized: false,
      initVariant(el) {
        this.variants = JSON.parse(this.$el.querySelector('[type="application/json"]').textContent);
        document.addEventListener(`eurus:product-variant-get:${sectionId}`, (e) => {
          e.detail.callback(this.variants);
        });  
        
        if (chooseOption) {
          this.handleSectionId = 'choose-option';
        }
        if (productBundle) {
          this.handleSectionId = handleSectionId;
        }
        
        if (!productBundle) {
          document.addEventListener('eurus:cart:items-changed', () => {
            this.cachedResults = [];
            Alpine.store('xUpdateVariantQuanity').updateQuantity(sectionId, productUrl, this.currentVariant?.id);
          });
        }
        this.$watch('options', () => {
          setTimeout(() => { 
            this._updateVariantSelector(productFeaturedImage, el);
          }, 0) // INP
        });
      },
      initMedia(init) {
        if (init) {
          this.initfirstMedia = true;
        }
        this._updateMasterId();
        this._updateMedia();
        this.initfirstMedia = false;
      },
      _updateVariantSelector(productFeaturedImage = "", el) {
        this._updateMasterId();
        this._updateVariantStatuses();
        this._updateOptionImage();
        
        if (!this.currentVariant) {
          this._dispatchUpdateVariant();
          this._setUnavailable();
          return;
        }
        if (firstAvailableVariantId != this.currentVariant.id) {
          this.paramVariant = true;
        }
        if (isProductPage && this.paramVariant) {
          window.history.replaceState({}, '', `?variant=${this.currentVariant.id}`);
        }
        if (chooseOption == '' && !isProductPage) {
          this._updateImageVariant(productFeaturedImage);
        }
        if(quickAddPageParam || updateImage){
          this._updateImageVariant(productFeaturedImage);
        }
        this._updateVariantInput();
        this._updateProductForms();
        this._setAvailable();
        Alpine.store('xPickupAvailable').updatePickUp(sectionId, this.currentVariant.id);
        const cacheKey = sectionId + '-' + this.currentVariant.id;
        if (this.cachedResults[cacheKey]) {
          const html = this.cachedResults[cacheKey];
          this._updateQuickAdd(html, el);
          this._renderPriceProduct(html);
          const selectors = ['block-inventory-', 'block-available-quantity-', 'quantity-selector-', 'volume-', 'x-availability-notice-', 'sku-', 'x-badges-', 'preorder-', 'cart-edt-'];
          for (let selector of selectors) {
            this._renderDestination(html, selector);
          }
          this._updateMedia(html);
          this._renderBuyButtons(html);
          this._setMessagePreOrder(html)
          this._setEstimateDelivery(html);
          const mtfSelectors = ['.properties_re_render', '.table_info_details', '.block-text', '.text-icon', '.collapsible-content', '.nutrition-bar-content', '.horizontab', '.featured-icon'];
          for (let selector of mtfSelectors) {
            this._setMetafieldInfo(html, selector);
          }
          this._setBackInStockAlert(html);
          this._setPickupPreOrder(html);
          this._dispatchUpdateVariant();
          this._dispatchVariantSelected(html);
          if (!productBundle) {
            Alpine.store('xUpdateVariantQuanity').render(html, sectionId);
          }
        } else {
          const variantId = this.currentVariant.id;
          let url = chooseOption?`${productUrl}?variant=${variantId}&section_id=${this.handleSectionId}&page=${pageParam ? pageParam : quickAddPageParam}`:`${productUrl}?variant=${variantId}&section_id=${this.handleSectionId}`
          fetch(url)
            .then((response) => response.text())
            .then((responseText) => {
              const html = new DOMParser().parseFromString(responseText, 'text/html');
              this._updateQuickAdd(html, el);
              if (this.currentVariant && variantId == this.currentVariant.id
                && html.getElementById(`x-product-template-${productId}-${sectionId}`)) {                  
                this._renderPriceProduct(html);
                const selectors = ['block-inventory-', 'block-available-quantity-', 'quantity-selector-', 'volume-', 'x-availability-notice-', 'sku-', 'x-badges-', 'preorder-', 'cart-edt-'];
                for (let selector of selectors) {
                  this._renderDestination(html, selector);
                }
                
                if (showFirstImageAvaiable) {
                  this._updateMedia(html);
                } else if (this.isChange) {
                  this._updateMedia(html);
                }
                this._renderBuyButtons(html);
                this._setMessagePreOrder(html);
                this._setEstimateDelivery(html);
                const mtfSelectors = ['.properties_re_render', '.table_info_details', '.block-text', '.text-icon', '.collapsible-content', '.nutrition-bar-content', '.horizontab', '.featured-icon'];
                for (let selector of mtfSelectors) {
                  this._setMetafieldInfo(html, selector);
                }
                this._setPickupPreOrder(html);
                this._setBackInStockAlert(html);
                
                if (!productBundle) {
                  Alpine.store('xUpdateVariantQuanity').render(html, sectionId);
                }
                this.cachedResults[cacheKey] = html;
                
                this._dispatchUpdateVariant(html);
                this._dispatchVariantSelected(html);
              } else if (this.currentVariant && variantId == this.currentVariant.id) {
                this._renderPriceProduct(html);
                this._dispatchUpdateVariant(html);
              }
            });
        }
      },
      _dispatchVariantSelected(html) {
        document.dispatchEvent(new CustomEvent(`eurus:product-page-variant-select:updated:${sectionId}`, {
          detail: {
            currentVariantStatus: this.currentVariant?.available,
            currentAvailableOptions: this.currentAvailableOptions,
            options: this.options,
            html: html
          }
        }));
      },
      _updateVariantStatuses() {
        const selectedOptionOneVariants = this.variants.filter(variant => this.options[0] === this._decodeOptionValue(variant.option1));
        this.options.forEach((option, index) => {
          this.currentAvailableOptions[index] = [];
          if (index === 0) return;
          const previousOptionSelected = this.options[index - 1];
          selectedOptionOneVariants.forEach((variant) => {
            if (variant.available && this._decodeOptionValue(variant[`option${ index }`]) === previousOptionSelected) {
              this.currentAvailableOptions[index].push(this._decodeOptionValue(variant[`option${ index + 1 }`]));
            }
          });
        });
      },
      _decodeOptionValue(option) {
        if (option) {
          return option
                  .replaceAll('\\/', '/');
        }
      },
      _renderDestination(html, selector) {
        const destination = document.getElementById(selector + sectionId);
        const source = html.getElementById(selector + sectionId);
        if (source && destination) destination.innerHTML = source.innerHTML;
      },
      _updateQuickAdd(html, el){
        const listCurrent = document.querySelectorAll(`#product-form-choose-option${productId}${quickAddPageParam ?? ''}`);
        const destination = html.querySelector(`#product-form-choose-option${productId}${quickAddPageParam ?? ''}`);
        if (listCurrent.length > 0 && destination){
          listCurrent.forEach((item) => {
            item.innerHTML = destination.innerHTML;
            const currentPrice = item.closest('.card-product').querySelector(".main-product-price");
            const updatePrice = html.querySelector(".main-product-price");
            if(currentPrice && updatePrice){
              currentPrice.innerHTML = updatePrice.innerHTML
            }
          })
        } else {
          if (listCurrent.length > 0) {
            listCurrent.forEach((item) => {
              item.innerHTML = html.querySelector('.form').innerHTML;
            })
          }
          const currentPrice = el?.closest('.card-product')?.querySelector(".main-product-price");
          const updatePrice = html.querySelector(".main-product-price");
          if(currentPrice && updatePrice){
            currentPrice.innerHTML = updatePrice.innerHTML
          }
        }
      },
      _updateMedia(html) {
        let mediaWithVariantSelected = document.getElementById("product-media-" + sectionId) && document.getElementById("product-media-" + sectionId).dataset.mediaWithVariantSelected;
        
        if (!chooseOption && !productBundle && !mediaWithVariantSelected) {
          let splideEl = document.getElementById("x-product-" + sectionId);
          let slideVariant = ""
          let index = ""
          let activeEL = ""
          if (this.currentVariant && this.currentVariant.featured_media != null) {
            slideVariant = document.getElementsByClassName(this.currentVariant.featured_media.id + '-' + sectionId);
            index = parseInt(slideVariant[0]?.getAttribute('index'));
            activeEL = document.getElementById('postion-image-' + sectionId + '-' + this.currentVariant.featured_media.id);
          } else {
            slideVariant = splideEl.querySelector(".featured-image");
            index = parseInt(slideVariant?.getAttribute('index'));
            activeEL = document.querySelector(`#stacked-${sectionId} .featured-image`);
          }
          
          if (splideEl) {
            if (splideEl.splide && slideVariant) {
              splideEl.splide.go(index)
            } else {
              document.addEventListener(`eurus:media-gallery-ready:${sectionId}`, () => {
                if (splideEl.splide)
                  splideEl.splide.go(index);
              });
            }
          }
          if (!activeEL) return;
          
          if (html && !mediaWithVariantSelected) {
            let mediaGalleryDestination = html.getElementById(`stacked-${ sectionId }`);
            let mediaGallerySource = document.getElementById(`stacked-${ sectionId }`);
            if (mediaGallerySource && mediaGalleryDestination) {
              let firstChildSource = mediaGallerySource.querySelectorAll('div[data-media-id]')[0];
              let firstChildDestination = mediaGalleryDestination.querySelectorAll('div[data-media-id]')[0];
              if (firstChildDestination.dataset.mediaId != firstChildSource.dataset.mediaId && firstChildSource.dataset.index != 1) {
                let sourceIndex = parseInt(firstChildSource.dataset.index);  
                let positionOld = mediaGallerySource.querySelector(`div[data-media-id]:nth-of-type(${sourceIndex + 1})`);
                mediaGallerySource.insertBefore(firstChildSource, positionOld);
              }
              mediaGallerySource.prepend(activeEL);
            }
          }
        }
        if (mediaWithVariantSelected) {
          this.updateMultiMediaWithVariant();
        }
      },
      _updateColorSwatch(html) {
        const showSwatchWithVariantImage = document.querySelector(`#variant-update-${ sectionId }`).dataset.showSwatchWithVariantImage;
        const destination = document.querySelector(`#variant-update-${ sectionId } [data-swatch="true"]`);
        if(destination && showSwatchWithVariantImage) {
          const source = html.querySelector(`#variant-update-${ sectionId } [data-swatch="true"]`);
          if (source) destination.innerHTML = source.innerHTML;
        }
      },
      _validateOption() {
        const mediaWithOption = document.querySelector(`#shopify-section-${sectionId} [data-media-option]`);
        if (mediaWithOption)
          this.mediaOption = mediaWithOption.dataset.mediaOption.split('_');
      },
      updateMultiMediaWithVariant() {
        this._validateOption();
        if (!this.currentVariant) {
          if (this.initfirstMedia) {
            let productMedia = document.querySelectorAll( `#ProductModal-${ sectionId } [data-media-option], #shopify-section-${ sectionId } [data-media-option]`);
            Array.from(productMedia).reverse().forEach(function(newMedia, position) {
              newMedia.classList.add('media_active');
              if (newMedia.classList.contains('media-slide')) {
                newMedia.classList.add('splide__slide');
              }
            });
          }
          return;
        }
        const variantInputs = this.mediaOption.map(option =>
          document.querySelector(`#shopify-section-${sectionId} [data-option-name="${option}"]`)
        ).filter(el => el !== null);
        if (variantInputs.length === 0) {
          let variantMedias = ""
          if (!this.currentVariant.featured_media?.id) {
            variantMedias = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-option].featured-image, #shopify-section-${ sectionId } [data-media-option].featured-image`); 
          } else {
            variantMedias = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-option="${sectionId}-${this.currentVariant.featured_media.id}"], #shopify-section-${ sectionId } [data-media-option="${sectionId}-${this.currentVariant.featured_media.id}"]`);
          }
          let mediaActive = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-option=""], #shopify-section-${ sectionId } [data-media-option=""]`);
          let productMedias = document.querySelectorAll( `#ProductModal-${ sectionId } [data-media-option], #shopify-section-${ sectionId } [data-media-option]`);
          const newMedias = Array.prototype.concat.call( ...mediaActive, ...variantMedias)
          this._setActiveMedia(productMedias, newMedias, variantMedias);
          let splideEl = document.getElementById(`x-product-${ sectionId }`);
          if (splideEl && splideEl.splide) {
            splideEl.splide.refresh();
            splideEl.splide.go(0);
          }
          let splideZoomEl = document.getElementById(`media-gallery-${ sectionId }`);
          if (splideZoomEl && splideZoomEl.splide) {
            splideZoomEl.splide.refresh();
          }
        } else {
          let optionConnects = [];
          variantInputs.forEach((variantInput) => {
            const variantOptionIndex = variantInput && variantInput.dataset.optionIndex;
            const optionValue = this._handleText(this.currentVariant.options[variantOptionIndex]);
            if (this.mediaOption.includes(variantInput.dataset.optionName)) {
              optionConnects.push(variantInput.dataset.optionName + '-' + optionValue);
            }
            this.optionIndex = variantOptionIndex;
          });
          const mediaActive = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-type=""], #shopify-section-${ sectionId } [data-media-type=""]`);
          
          let variantMedias = [];
          let allVariantMedias = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-type]:not([data-media-type=""]), #shopify-section-${ sectionId } [data-media-type]:not([data-media-type=""])`);
          allVariantMedias.forEach((variantMedia) => {
            let data = variantMedia.getAttribute('data-media-type');
            let dataSet = new Set(data.split('_'));
            if (optionConnects.filter(option => dataSet.has(option)).length === dataSet.size) variantMedias.push(variantMedia);
          });
          let showFeatured = false;
          if (!variantMedias.length) {
            if (!this.currentVariant.featured_media?.id) {
              variantMedias = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-option].featured-image, #shopify-section-${ sectionId } [data-media-option].featured-image`); 
              showFeatured = true;
            } else {
              variantMedias = document.querySelectorAll(`#ProductModal-${ sectionId } [data-media-id="${sectionId}-${this.currentVariant.featured_media.id}"], #shopify-section-${ sectionId } [data-media-id="${sectionId}-${this.currentVariant.featured_media.id}"]`);
            }
          }
          if (!variantMedias.length) {
            document.querySelectorAll( `#ProductModal-${ sectionId } [data-media-type], #shopify-section-${ sectionId } [data-media-type]`).forEach(function(media){
              media.classList.add('media_active');
              media.classList.add('splide__slide');
            });
            let splideEl = document.getElementById(`x-product-${ sectionId }`);
            if (splideEl.splide) {
              splideEl.splide.refresh();
              splideEl.splide.go(0);
            }
            let splideZoomEl = document.getElementById(`media-gallery-${ sectionId }`);
            if (splideZoomEl.splide) {
              splideZoomEl.splide.refresh();
            }
            return;
          }
          
          const newMedias = Array.prototype.concat.call(...variantMedias , ...mediaActive);
          let productMedias = document.querySelectorAll( `#shopify-section-${ sectionId } [data-media-type], #ProductModal-${ sectionId } [data-media-type]`);
          
          this._setActiveMedia(productMedias, newMedias);
          
          if (this.optionConnect != optionConnects) {
            this.optionConnect = optionConnects;
          }
          
          let splideEl = document.getElementById(`x-product-${ sectionId }`);
          if (splideEl.splide) {
            splideEl.splide.refresh();
            splideEl.splide.go(0);
          }
          let splideZoomEl = document.getElementById(`media-gallery-${ sectionId }`);
          if(splideZoomEl && splideZoomEl.splide){
            splideZoomEl.splide.refresh();
          }
          
          if (showFeatured) {
            this._goToFirstSlide();
          }  
        }
      },
      _setActiveMedia(productMedias, newMedias, activeMedia) {
        productMedias.forEach(function(media){
          media.classList.remove('media_active');
          media.classList.remove('splide__slide');
          media.classList.remove('x-thumbnail');
        });
        Array.from(newMedias).reverse().forEach(function(newMedia, position) {
          newMedia.classList.add('media_active');
          if (newMedia.classList.contains('media-thumbnail')) {
            newMedia.classList.add('x-thumbnail');
          }
          if (newMedia.classList.contains('media-slide')) {
            newMedia.classList.add('splide__slide');
          }
          let parent = newMedia.parentElement;
          if (activeMedia) {
            if (parent.firstChild != newMedia && Array.from(activeMedia).includes(newMedia)) {
              parent.prepend(newMedia);
            }
          } else {
            if (parent.firstChild != newMedia) {
              parent.prepend(newMedia);
            }
          }
        });
        if (activeMedia) {
          let parent = activeMedia.parentElement;
          parent && parent.prepend(activeMedia);
        }
      },
      _handleText(someString) {
        if (someString) {
          return someString.toString().replace('ı', 'i').replace('ß', 'ss').normalize('NFC').replace('-', ' ').toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, "-");
        }
      },
      _goToFirstSlide() {
        if (this.currentVariant && !this.currentVariant.featured_image) {
          let splideEl = document.getElementById("x-product-" + sectionId);
          if (splideEl) {
            if (splideEl.splide && this.currentVariant && this.currentVariant.featured_image != null) {
              splideEl.splide.go(0);
            }
          }
          let activeEL = document.querySelector(`#stacked-${sectionId} .featured-image`);
          let stackedEL = document.getElementById('stacked-' + sectionId);
          if(stackedEL && activeEL) stackedEL.prepend(activeEL);
        }
      },
      onChange(el, src, isColor = false) {
        if (!this.isChange) {
          this.isChange = this.$el.parentNode.dataset.optionName;
        }
        let variantSrc = this.variants.reduce((acc, variant) => {
          if (variant.featured_image) {
            acc[variant.id] = variant.featured_image.src;
          }
          return acc;
        }, {});
        if (!isColor) {    
          const swatchesContainer = el.closest('.options-container');
          const swatches = swatchesContainer.querySelectorAll('label.color-watches');
          const inputs = swatchesContainer.querySelectorAll('input:checked');
          let selectedOption = [];
          inputs.forEach(input => { 
            if (![...swatches].some(swatch => swatch.dataset.optionvalue === input.value)) {
              selectedOption.push(input.value);
            }
          });
          let imageSrc = this.variants
            .filter(variant => selectedOption.every(option => variant.options.includes(option)))
            .map(variant => `url(${variantSrc[variant.id] ? variantSrc[variant.id] : src})`);
          
          swatches.forEach((swatch, index) => {
            swatch.style.setProperty('--bg-image',  imageSrc[index]);
          });
        }
      },
      _updateMasterId() {
        this.currentVariant = this.variants.find((variant) => {
          return !variant.options.map((option, index) => {
            return this.options[index] === option.replaceAll('\\/', '/');
          }).includes(false);
        });
      },
      _updateVariantInput() {
        const productForms = document.querySelectorAll(`#product-form-${sectionId}, #product-form-installment-${sectionId}, #product-form-sticky-${sectionId}`);
        productForms.forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          if (!input) return;
          input.value = this.currentVariant.id;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })
      },
      _updateProductForms() {
        const productForms = document.querySelectorAll(`#product-form-${sectionId}, #product-form-installment-${sectionId}, #product-form-sticky-${sectionId}`);
        productForms.forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          if (input) {
            input.value = this.currentVariant.id;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      },
      _renderPriceProduct(html) {
        const destination = document.getElementById('price-' + sectionId);
        let source = html.getElementById('price-' + sectionId);
        if(!source) {
          source = html.querySelector('.price');
          if (source && destination) destination.innerHTML = source.outerHTML;
        } else {
          if (source && destination) destination.innerHTML = source.innerHTML;
        }
      },
      _renderBuyButtons(html) {
        const productForms = document.querySelectorAll(`#product-form-${sectionId}, #product-form-installment-${sectionId}, #product-form-sticky-${sectionId}`);
        
        productForms.forEach((productForm) => {
          const atcSource = html.querySelector(`#${productForm.getAttribute("id")} .add_to_cart_button`);
          const atcDestination = productForm.querySelector('.add_to_cart_button');
          if (!atcDestination) return;
          if (atcSource && atcDestination) atcDestination.innerHTML = atcSource.innerHTML;
  
          if (this.currentVariant?.available) {
            /// Enable add to cart button
            atcDestination.dataset.available = "true";
            if (html.getElementById('form-gift-card-' + sectionId)) {
              if (document.getElementById('Recipient-checkbox-' + sectionId).checked && document.getElementById('recipient-form-' + sectionId).dataset.disabled == "true") {
                atcDestination.setAttribute('disabled', 'disabled') 
              } else {
                atcDestination.removeAttribute('disabled');
              }
            } else {
              atcDestination.removeAttribute('disabled');
            }
          } else {
            atcDestination.dataset.available = "false";
            atcDestination.setAttribute('disabled', 'disabled');
          }
        });
        const paymentButtonDestination = document.getElementById('x-payment-button-' + sectionId);
        const paymentButtonSource = html.getElementById('x-payment-button-' + sectionId);
        if (paymentButtonSource && paymentButtonDestination) {
          if (paymentButtonSource.classList.contains('hidden')) {
            paymentButtonDestination.classList.add('hidden');
          } else {
            paymentButtonDestination.classList.remove('hidden');
          }
        }
      },
      _setMessagePreOrder(html) {
        const msg = document.querySelector(`.pre-order-${sectionId}`);
        if (!msg) return;
        msg.classList.add('hidden');
        const msg_pre = html.getElementById(`pre-order-${sectionId}`);
        if (msg_pre) {
          msg.classList.remove('hidden');
          msg.innerHTML = msg_pre.innerHTML;
        }
      },
      _setEstimateDelivery(html) {
        const est = document.getElementById(`x-estimate-delivery-${sectionId}`);
        if (!est) return;
        const est_res = html.getElementById(`x-estimate-delivery-${sectionId}`);
        if (est_res.classList.contains('disable-estimate')) {
          est.classList.add('hidden');
        } else {
          est.classList.remove('hidden');
          est.innerHTML = est_res.innerHTML;
        }
        const estimateDeliveryCart = document.querySelectorAll(`.cart-edt-${sectionId}`);
        const estimateDeliveryCartUpdate = html.querySelectorAll(`.cart-edt-${sectionId}`);
        if (estimateDeliveryCart.length > 0 && estimateDeliveryCartUpdate.length > 0) {
          estimateDeliveryCart.forEach((item, index) => {
            if(estimateDeliveryCartUpdate[index] != undefined && estimateDeliveryCartUpdate[index].innerHTML != undefined ){
              item.innerHTML = estimateDeliveryCartUpdate[index].innerHTML;
            }
          })
        }
      },
      _setMetafieldInfo(html, query) {
        const content_arr = document.querySelectorAll(`${query}-${sectionId}`);
        const content_res_arr = html.querySelectorAll(`${query}-${sectionId}`);       
        if (content_arr.length > 0 && content_res_arr.length > 0) {
          content_arr.forEach((toc, index) => {
            toc.innerHTML = content_res_arr[index].innerHTML;
          })
        }
      },
      _setBackInStockAlert(html) {
        if (!this.initialized) {
          this.initialized = true;
          return;
        }
        const destination = document.getElementById(`back_in_stock_alert-${sectionId}`);
        const source = html.getElementById(`back_in_stock_alert-${sectionId}`);
        if (source && destination) destination.innerHTML = source.innerHTML;
      },
      _setPickupPreOrder(html) {
        const pickup = document.getElementById(`pickup-pre-order-${sectionId}`);
        if (!pickup) return;
        const pickup_res = html.getElementById(`pickup-pre-order-${sectionId}`);
        if (pickup_res.classList.contains('disable-pickup')) {
          pickup.classList.add('hidden');
        } else {
          pickup.classList.remove('hidden');
        }
      },
      _setUnavailable() {
        const selectors = ['price-', 'price-sticky-', 'block-inventory-', 'x-badges-', 'pickup-', 'sku-', 'back_in_stock_alert-'];
        for (let selector of selectors) {
          const element = document.getElementById(selector + sectionId);
          if (element) element.classList.add('hidden');
        }
        
        const msg_pre = document.querySelector(`.pre-order-${sectionId}`);
        if (msg_pre) msg_pre.classList.add('hidden');
        const quantity = document.getElementById('x-quantity-' + sectionId);
        if (quantity) quantity.classList.add('unavailable');
        this._setBuyButtonUnavailable();
      },
      _setAvailable() {
        const selectors = ['price-', 'block-inventory-', 'x-badges-', 'pickup-', 'sku-', 'back_in_stock_alert-'];
        for (let selector of selectors) {
          const element = document.getElementById(selector + sectionId);
          if (element) element.classList.remove('hidden');
        }
        const quantity = document.getElementById('x-quantity-' + sectionId);
        if (quantity) quantity.classList.remove('unavailable');
      },
      _setBuyButtonUnavailable() {
        const productForms = document.querySelectorAll(`#product-form-${sectionId},  #product-form-sticky-${sectionId}`);
        productForms.forEach((productForm) => {
          const addButton = productForm.querySelector('.add_to_cart_button');
          if (!addButton) return;
          addButton.setAttribute('disabled', 'disabled');
          const addButtonText = addButton.querySelector('.x-atc-text');
          if (addButtonText) addButtonText.textContent = unavailableText;
        });
      },
      _dispatchUpdateVariant(html="") {
        document.dispatchEvent(new CustomEvent(`eurus:product-card-variant-select:updated:${sectionId}`, {
          detail: {
            currentVariant: this.currentVariant,
            currentAvailableOptions: this.currentAvailableOptions,
            options: this.options,
            html: html
          }
        }));
      },
      _updateImageVariant(productFeaturedImage = "") {
        if (this.currentVariant != null) {
          let featured_image = productFeaturedImage;
          if (this.currentVariant.featured_image != null) {
            featured_image = this.currentVariant.featured_image.src;
          }
          Alpine.store('xPreviewColorSwatch').updateImage(this.$el, productUrl, featured_image, this.currentVariant.id, sectionId);
        }
      },
      _updateOptionImage() {
        if (element.closest('.card-product') && this.currentVariant && this.currentVariant.featured_image) {
          const option_image = this.currentVariant.featured_image.src;
          const card_label = this.options
            .map(option => element.querySelector(`label.color-watches[data-name*="${option.replace(/["\\]/g, '\\$&')}"]`))
            .find(label => label !== null);
          if (card_label) card_label.style.setProperty('--bg-image', `url(${option_image})`)
        }
      },
      initEventSticky() {
        document.addEventListener(`eurus:product-page-variant-select-sticky:updated:${sectionId}`, (e) => {
          this.handleSticky = e.detail.variantElSticky;
          this.updateVariantSelector(e.detail.inputId, e.detail.targetUrl);
        });
      },
      changeSelectOption(event) {
        Array.from(event.target.options)
          .find((option) => option.getAttribute('selected'))
          .removeAttribute('selected');
          event.target.selectedOptions[0].setAttribute('selected', 'selected');
        const input = event.target.selectedOptions[0];
        const inputId = input.id;
        const targetUrl = input.dataset.productUrl;
        this.updateVariantSelector(inputId, targetUrl);
      },
      updateVariantSelector(inputId, target) {
        if (chooseOption) {
          this.handleSectionId = 'choose-option';
        }
        if (productBundle) {
          this.handleSectionId = handleSectionId;
        }
        this.currentVariant = this._getVariantData(inputId);
        let updateFullpage = false;
        let callback = () => {};
        
        const targetUrl = target || element.dataset.url;
        if (element.dataset.url !== targetUrl) {
          this._updateURL(targetUrl);
          this._setAvailable();
          if (isProductPage) {
            updateFullpage = true;
          }
          callback = (html) => {
            this._handleSwapProduct(sectionId, html, updateFullpage);
            this._handleSwapQuickAdd(html);
            this._renderCardBundle(html);
            this._renderCardFBT(html);
            this._dispatchUpdateVariant(html);
          };
        } else if (!this.currentVariant) {
          this._setUnavailable();
          callback = (html) => {
            this._updateOptionValues(html);
            this._dispatchVariantSelected(html);
            this._dispatchUpdateVariant(html);
          };
        } else {
          this._updateURL(targetUrl);
          this._updateVariantInput();
          this._setAvailable();
          callback = (html) => {
            this._handleUpdateProductInfo(html);
            this._updateOptionValues(html);
            this._updateMedia(html);
            this._handleAvailable(html);
          }
        }
        this._renderProductInfo(targetUrl, callback, updateFullpage);
      },
      _renderProductInfo(url, callback, updateFullpage) {
        let link = "";
        let params = `option_values=${this._getSelectedOptionValues().join(',')}`;
        if (chooseOption || productBundle) {
          params = `option_values=${this._getSelectedOptionValues().join(',')}&page=${pageParam}`;
        }
        link = updateFullpage?`${url}?${params}`:`${url}?section_id=${this.handleSectionId}&${params}`;
    
        if (this.cachedResults[link]) {
          const html = this.cachedResults[link];
          callback(html);
        } else {
          fetch(link)
            .then((response) => response.text())
            .then((responseText) => {
              const html = new DOMParser().parseFromString(responseText, 'text/html');
              callback(html);
              this.cachedResults[link] = html;
            })
        }
        this.handleSticky = '';
      },
      _handleUpdateProductInfo(html) {
          this._renderCardBundle(html);
          this._renderCardFBT(html);
          this._renderPriceProduct(html);
          const selectors = ['block-inventory-', 'block-available-quantity-', 'quantity-selector-', 'volume-', 'sku-', 'x-badges-', 'preorder-', 'cart-edt-'];
          for (let selector of selectors) {
            this._renderDestination(html, selector);
          }
          this._renderBuyButtons(html);
          this._setMessagePreOrder(html);
          this._setEstimateDelivery(html);
          
          const mtfSelectors = ['.properties_re_render', '.table_info_details', '.block-text', '.text-icon', '.collapsible-content', '.nutrition-bar-content', '.horizontab', '.featured-icon'];
          for (let selector of mtfSelectors) {
            this._setMetafieldInfo(html, selector);
          }
          this._setPickupPreOrder(html);
          this._setBackInStockAlert(html);
          if (!productBundle) {
            Alpine.store('xUpdateVariantQuanity').render(html, this.handleSectionId);
          }
          this._dispatchUpdateVariant(html);
          this._dispatchVariantSelected(html);
          this._updateOptionValues(html);
          Alpine.store('xPickupAvailable').updatePickUp(sectionId, this.currentVariant.id);
          
      },
      initFirstAvailableVariant(el) {
        this.currentVariant = JSON.parse(el.querySelector(`script[type="application/json"][data-selected-variant]`).textContent);
        if (!productBundle) {
          document.addEventListener('eurus:cart:items-changed', () => {
            this.cachedResults = [];
            Alpine.store('xUpdateVariantQuanity').updateQuantity(sectionId, productUrl, this.currentVariant?.id);
          });
        }
      },
      _handleAvailable(html) {
        const selectedVariant = html.querySelector('.variant-selects [data-selected-variant]')?.innerHTML;
        if (selectedVariant == 'null') {
          this._setUnavailable();
        }
      },
      _updateOptionValues(html) {
        if (!productBundle) {
          const variantSelects = html.querySelector('.variant-selects');
          if (variantSelects) element.innerHTML = variantSelects.innerHTML;
        }
      },
      _getVariantData(inputId) {
        return JSON.parse(this._getVariantDataElement(inputId).textContent);
      },
      _getVariantDataElement(inputId) {
        return element.querySelector(`script[type="application/json"][data-resource="${inputId}"]`);
      },
      _updateURL(url) {
        if (!isProductPage) return;
        window.history.replaceState({}, '', `${url}${this.currentVariant?.id ? `?variant=${this.currentVariant.id}` : ''}`);
      },
      _getSelectedOptionValues() {
        if (this.handleSticky == '') {
          return Array.from(element.querySelectorAll('select option[selected], fieldset input:checked')).map(
            (e) => e.dataset.optionValueId
          );
        } else {
          return Array.from(this.handleSticky.querySelectorAll('select option[selected]')).map(
            (e) => e.dataset.optionValueId
          );
        }
      },
      _renderCardBundle(html) {
        const destination = element.closest(".x-product-bundle-data");
        const card = html.getElementById('card-product-bundle-'+ this.handleSectionId);
        if (card) {
          const source = card.querySelector(".x-product-bundle-data");
          if (source && destination) destination.innerHTML = source.innerHTML;
        }
      },
      _renderCardFBT(html) {
        const destination = element.closest(".card-product-fbt");
        const source = html.querySelector('.card-product-fbt-clone .card-product-fbt');
        
        if (source && destination) destination.innerHTML = source.innerHTML;
      },
      _handleSwapProduct(sectionId, html, updateFullpage) {
        if (updateFullpage) {
          document.querySelector('head title').innerHTML = html.querySelector('head title').innerHTML;
          const destination = document.querySelector('main');
          const source = html.querySelector('main');
          if (source && destination) destination.innerHTML = source.innerHTML;
        } else {
          const destination = document.querySelector('.x-product-' + sectionId);
          const source = html.querySelector('.x-product-' + sectionId);
          if (source && destination) destination.innerHTML = source.innerHTML;
        }
      },
      _handleSwapQuickAdd(html) {
        const destination = element.closest(".choose-options-content");
        const source = html.querySelector('.choose-options-content');
        if (source && destination) destination.innerHTML = source.innerHTML;
      }
    }))

  
  Alpine.data('xStickyATC', (sectionId, is_combined) => ({
    openDetailOnMobile: false,
    currentAvailableOptions: [],
    options: [],
    init() {
      if (!is_combined) {
        this.variants = xParseJSON(this.$el.getAttribute('x-variants-data'));
      }

      document.addEventListener(`eurus:product-page-variant-select:updated:${sectionId}`, (e) => {
        if (is_combined) {
          this.renderVariant(e.detail.html);
        } else {
          this.currentAvailableOptions = e.detail.currentAvailableOptions,
          this.options = e.detail.options;
        }

        this.renderProductPrice(e.detail.html);
        this.renderMedia(e.detail.html);
      });
    },
    renderProductPrice(html) {
      const destinations = document.querySelectorAll(`.price-sticky-${sectionId}`);
      destinations.forEach((destination) => {
        const source = html.getElementById('price-sticky-' + sectionId);
        if (source && destination) destination.innerHTML = source.innerHTML;
      })
    },
    renderMedia(html) {
      const destination = document.getElementById('product-image-sticky-' + sectionId);
      const source = html.getElementById('product-image-sticky-' + sectionId);

      if (source && destination) destination.innerHTML = source.innerHTML;
    },
    renderVariant(html) {
      const destination = document.getElementById('variant-update-sticky-' + sectionId);
      const source = html.getElementById('variant-update-sticky-' + sectionId);

      if (source && destination) destination.innerHTML = source.innerHTML;
    },
    changeOptionSticky(event) {
      Array.from(event.target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      event.target.selectedOptions[0].setAttribute('selected', 'selected');
      const input = event.target.selectedOptions[0];
      const inputId = input.id;
      const targetUrl = input.dataset.productUrl;
      const variantEl = document.getElementById('variant-update-sticky-' + sectionId);
      document.dispatchEvent(new CustomEvent(`eurus:product-page-variant-select-sticky:updated:${sectionId}`, {
        detail: {
          inputId: inputId,
          targetUrl: targetUrl,
          variantElSticky: variantEl
        }
      }));
    }
  }));
  

  Alpine.store('xPickupAvailable', {
    updatePickUp(id, variantId) {
      const container = document.getElementsByClassName('pick-up-'+ id)[0];
      if (!container) return;

      fetch(window.Shopify.routes.root + `variants/${variantId}/?section_id=pickup-availability`)
        .then(response => response.text())
        .then(text => {
          const pickupAvailabilityHTML = new DOMParser()
            .parseFromString(text, 'text/html')
            .querySelector('.shopify-section');  
          container.innerHTML = pickupAvailabilityHTML.innerHTML;
        })
        .catch(e => {
          console.error(e);
        }); 
    }
  });

  Alpine.store('xUpdateVariantQuanity', {
    updateQuantity(sectionId, productUrl, currentVariant) {
      const quantity = document.getElementById('x-quantity-' + sectionId);
      if (!quantity) return;
      const url = currentVariant ? `${productUrl}?variant=${currentVariant}&section_id=${sectionId}` :
                    `${productUrl}?section_id=${sectionId}`;
      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          let html = new DOMParser().parseFromString(responseText, 'text/html');
          this.render(html, sectionId);
        });
    },
    render(html, sectionId) {
      const destination = document.getElementById('x-quantity-' + sectionId);
      const source = html.getElementById('x-quantity-'+ sectionId);
      if (source && destination) destination.innerHTML = source.innerHTML;
    }
  });

  Alpine.store('xVideo', {
    ytIframeId: 0,
    vimeoIframeId: 0,
    externalListened: false,

    togglePlay(el) {
      const videoContainer = el.closest('.external-video');
      let video = el.getElementsByClassName('video')[0];
      if (!video && el.closest('.contain-video')) {
        video = el.closest('.contain-video').getElementsByClassName('video')[0];
      }
      if (video) {
        if (videoContainer) {
          video.paused ? videoContainer.classList.remove('function-paused') : videoContainer.classList.add('function-paused');
          const buttonPlay = videoContainer.getElementsByClassName('button-play')[0];
          if (buttonPlay) {
            video.paused ? buttonPlay.classList.remove('hidden') : buttonPlay.classList.add('hidden');
          }  
        }
        video.paused ? this.play(el) : this.pause(el);
      }
    },
    play(el) {
      const videoContainer = el.closest('.external-video');
      let video = el.getElementsByClassName('video')[0];
      if (!video && el.closest('.contain-video')) {
        video = el.closest('.contain-video').getElementsByClassName('video')[0];
      }
      if (video) {
        if (videoContainer) {
          const buttonPlay = videoContainer.getElementsByClassName('button-play')[0];
          if (video.tagName == 'IFRAME') {
            if (videoContainer.classList.contains('function-paused')) this.externalPostCommand(video, 'play');
            videoContainer.classList.remove('function-paused');
          } else if (video.tagName == 'VIDEO') {
            if (!videoContainer.classList.contains('function-paused')) {
              if (buttonPlay) buttonPlay.classList.add('hidden');
              video.play().catch((error) => {
                if (buttonPlay) buttonPlay.classList.remove('hidden');
              });
            }
          }
        }
      }
    },
    pause(el) {
      const videoContainer = el.closest('.external-video');
      let video = el.getElementsByClassName('video')[0];
      if (!video && el.closest('.contain-video')) {
        video = el.closest('.contain-video').getElementsByClassName('video')[0];
      }
      if (video) {
        if (videoContainer) {
          const buttonPlay = videoContainer.getElementsByClassName('button-play')[0];
          if (video.tagName == 'IFRAME') {
            if (!videoContainer.classList.contains('paused')) {
              videoContainer.classList.add('function-paused');
            }
            this.externalPostCommand(video, 'pause');
          } else if (video.tagName == 'VIDEO') {
            if (buttonPlay) buttonPlay.classList.remove('hidden');
            video.pause();
          }
        }
      }
    },
    load(el) {
      el?.classList.add('active');
      el?.closest('.animate_transition_card__image')?.classList.remove('animate-Xpulse', 'skeleton-image');
      setTimeout(() => { el.closest('.animate_transition_card__image')?.classList.add('lazy_active'); }, 250);  
    },
    mp4Thumbnail(el) {
      const videoContainer = el.closest('.external-video');
      const imgThumbnail = videoContainer.getElementsByClassName('img-thumbnail')[0];
      const imgThumbnailMobile = videoContainer.getElementsByClassName('img-thumbnail')[1];
      if (imgThumbnail) {
        imgThumbnail.classList.add('hidden');
        imgThumbnail.classList.add('md:hidden');
      }
      if (imgThumbnailMobile) {
        imgThumbnailMobile.classList.add('hidden');
      }
      this.togglePlay(el);
    },
    externalLoad(el, host, id, loop, title, controls = 1) {
      let src = '';
      let pointerEvent = '';
      if (host == 'youtube') {
        src = `https://www.youtube.com/embed/${id}?mute=1&playlist=${id}&autoplay=1&playsinline=1&enablejsapi=1&modestbranding=1&rel=0&controls=${controls}&showinfo=${controls}`;
      } else {
        src = `https://player.vimeo.com/video/${id}?muted=1&autoplay=1&playsinline=1&api=1&controls=${controls}`;
      }

      if (controls == 0) {
        pointerEvent = " pointer-events-none";
      }
      requestAnimationFrame(() => {
        const videoContainer = el.closest('.external-video');
        videoContainer.innerHTML = `<iframe data-video-loop="${loop}" class="iframe-video absolute w-full h-full video top-1/2 -translate-y-1/2 ${ pointerEvent }"
          frameborder="0" host="${host}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen playsinline
          src="${src}" title="${title}"></iframe>`;

        videoContainer.querySelector('.iframe-video').addEventListener("load", () => {
          setTimeout(() => {
            this.play(videoContainer);

            if (host == 'youtube') {
              this.ytIframeId++;
              videoContainer.querySelector('.iframe-video').contentWindow.postMessage(JSON.stringify({
                event: 'listening',
                id: this.ytIframeId,
                channel: 'widget'
              }), '*');
            } else {
              this.vimeoIframeId++;
              videoContainer.querySelector('.iframe-video').contentWindow.postMessage(JSON.stringify({
                method: 'addEventListener',
                value: 'finish'
              }), '*');
              videoContainer.querySelector('.iframe-video').contentWindow.postMessage(JSON.stringify({
                method: 'addEventListener',
                value: 'play'
              }), '*');
              videoContainer.querySelector('.iframe-video').contentWindow.postMessage(JSON.stringify({
                method: 'addEventListener',
                value: 'pause'
              }), '*');
            }
          }, 100);
        });
      });

      this.externalListen();
    },
    renderVimeoFacade(el, id, options) {
      fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=${options.width}`)
        .then(reponse => {
          return reponse.json();
        }).then((response) => {
          const html = `
            <picture>
              <img src="${response.thumbnail_url}" loading="lazy" class="w-full h-full object-cover" alt="${options.alt}" width="${response.width}" height="${response.height}"/>
            </picture>
          `;
          
          requestAnimationFrame(() => {
            el.innerHTML = html;
          });
        });
    },
    externalListen() {
      if (!this.externalListened) {
        window.addEventListener('message', (event) => {
          var iframes = document.getElementsByTagName('IFRAME');

          for (let i = 0, iframe, win, message; i < iframes.length; i++) {
            iframe = iframes[i];

            // Cross-browser way to get iframe's window object
            win = iframe.contentWindow || iframe.contentDocument.defaultView;

            if (win === event.source) {
              if (event.origin == 'https://www.youtube.com') {
                message = JSON.parse(event.data);
                if (iframe.getAttribute('data-video-loop') === 'true') {
                  if (message.info && message.info.playerState == 0) {
                    this.externalPostCommand(iframe, 'play');
                  }  
                }
                if (message.info && message.info.playerState == 1) {
                  iframe.parentNode.classList.remove('paused');
                  iframe.parentNode.classList.remove('function-paused');
                }
                if (message.info && message.info.playerState == 2) {
                  iframe.parentNode.classList.add('paused');
                }
              }

              if (event.origin == 'https://player.vimeo.com') {
                message = JSON.parse(event.data);
                if (iframe.getAttribute('data-video-loop') !== 'true') {
                  if (message.event == "finish") {
                    this.externalPostCommand(iframe, 'play');
                  }
                }
                if (message.event === 'play') {
                  iframe.parentNode.classList.remove('paused');
                  iframe.parentNode.classList.remove('function-paused');
                }
                if (message.event === 'pause') {
                  iframe.parentNode.classList.add('paused');
                }
              }
            }
          }
        });

        this.externalListened = true;
      }
    },
    externalPostCommand(iframe, cmd) {
      const host = iframe.getAttribute('host');
      const command = host == 'youtube' ? {
        "event": "command",
        "func": cmd + "Video"
      } : {
        "method": cmd,
        "value": "true"
      };

      iframe.contentWindow.postMessage(JSON.stringify(command), '*');
    },
    toggleMute(el) {
      let video = el.closest('.video-hero') && el.closest('.video-hero').getElementsByClassName('video')[0];
      if (!video && el.closest('.contain-video')) {
        video = el.closest('.contain-video').getElementsByClassName('video')[0];
      }
      if (video) {
         if (video.tagName != 'IFRAME') {
            video.muted = !video.muted;
         }
      }
    }
  });

  Alpine.data('xShippingPolicy', (url) => ({
    show: false,
    htmlInner: '',
    loadShipping() {
      this.show = true;
      Alpine.store('xPopup').open = true;
      fetch(url)
        .then(response => response.text())
        .then(data => {
          const parser = new DOMParser();
          const text = parser.parseFromString(data, 'text/html');
          this.htmlInner = text.querySelector('.shopify-policy__container').innerHTML;
        })
    },
    shippingFocus() {
      Alpine.store('xFocusElement').trapFocus('ShippingPolicyPopup','CloseShopping');
    },
    shippingRemoveFocus() {
      const activeElement = document.getElementById('LoadShoppingPolicy');
      Alpine.store('xFocusElement').removeTrapFocus(activeElement);
    }
  }));
  
  Alpine.store('xScrollPromotion', {
    animationFrameId: null,
    window_height: window.innerHeight,

    load(el) {
      let scroll = el.getElementsByClassName('el_animate');
      for (let i = 0; i < scroll.length; i++) {
        scroll[i].classList.add('animate-scroll-banner');
      }
    },

    createObserver(el, rtlCheck = false) {
      const option = {
        root: null,
        rootMargin: '300px',
        threshold: 0
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.updateRotation(el, rtlCheck)
          } else {
            if (this.animationFrameId) {
              cancelAnimationFrame(this.animationFrameId);
              this.animationFrameId = null;
            }
          }
        });
      }, option);

      observer.observe(el);
    },

    updateRotation(el, rtlCheck = false) {
      const update = () => {
        const element = el.firstElementChild;
        if (!element) return;

        const element_rect = element.getBoundingClientRect();
        const element_height = element_rect.top + element_rect.height / 2;
        let value;
          
        if (element_height > -200 && element_height < this.window_height + 200) {
          value = Math.max(Math.min((((element_height / this.window_height) * 10) - 5), 5), -5);
          if (rtlCheck) value *= -1;
          element.style.transform = `rotate(${value}deg) translateX(-20px)`;
        }

        this.animationFrameId = window.requestAnimationFrame(update);
      }

      if (!this.animationFrameId) {
        update();
      }
    },
  });

  Alpine.data('xCartFields', () => ({
    custom_field: '',
    custom_field_label: '',
    custom_field_required: false,
    custom_field_error: false,
    openField: false,
    t: '',
    loadData() {
      const data = xParseJSON(this.$el.getAttribute('x-cart-fields-data'));

      this.custom_field = localStorage.cart_custom_field ? localStorage.cart_custom_field : '';
      this.custom_field_label = data.custom_field_label;
      this.custom_field_required = data.custom_field_required;
      this.custom_field_pattern = new RegExp(data.custom_field_pattern);
      this.save();

      this.$el.querySelector("#x-cart-custom-field").addEventListener("focusout", (event) => {
        this.save();
      });

      document.addEventListener('eurus:cart:validate', () => {
        this.custom_field = localStorage.cart_custom_field ? localStorage.cart_custom_field : '';
        if (this.custom_field_required && (!this.custom_field || this.custom_field.length == 0)
          || (this.custom_field && !this.custom_field.match(this.custom_field_pattern))) {
          this.custom_field_error = true;
          Alpine.store('xCartHelper').openField = 'custom_field';
          Alpine.store('xCartHelper').validated = false;
        } else {
          this.custom_field_error = false;
        }
      });
    },
    save() {
      clearTimeout(this.t);

      const func = () => {
        var attributes = { attributes: {} }
        attributes.attributes[this.custom_field_label] = this.custom_field;
        Alpine.store('xCartHelper').updateCart(attributes, true);
        localStorage.cart_custom_field = this.custom_field;
      }
      
      this.t = setTimeout(() => {
        func();
      }, 200);
    }
  }));
  
  Alpine.data('xCartTerm', (message) => ({
    message: message,
    checked: false,
    init() {
      this.checked = localStorage.cart_term_checked == 'agreed' ? true : false;

      this.$watch('checked', () => {
        this.save();
      });

      document.addEventListener('eurus:cart:validate', () => {
        this.checked = localStorage.cart_term_checked == 'agreed' ? true : false;
        if (!this.checked) Alpine.store('xCartHelper').validated = false;
      });
    },
    save() {
      clearTimeout(this.t);

      const func = () => {
        var status = this.checked ? 'agreed' : 'not agreed';
        Alpine.store('xCartHelper').updateCart({
          attributes: {
            'Terms and conditions': status
          }
        });
        localStorage.cart_term_checked = status;
      }
      
      this.t = setTimeout(() => {
        func();
      }, 200);
    }
  }));

  Alpine.data("xCouponCodeList", (sectionId) => ({
    loading: true,
    load() {
      this.loading = true;
      let url = `${window.location.pathname}?section_id=${sectionId}`;
      fetch(url, {
        method: 'GET'
      }).then(
        response => response.text()
      ).then(responseText => {
        const html = (new DOMParser()).parseFromString(responseText, 'text/html');
        const contentId = `x-promo-code-list-${sectionId}`;
        const newContent = html.getElementById(contentId);
        if (newContent && !document.getElementById(contentId)) {
          container.appendChild(newContent);
        }
        this.loading = false;
      })
    }
  }));
  
  Alpine.data("xCouponCode", (freeShippingCodes) => ({
    copySuccess: false,
    loading: false,
    disableCoupon: false,
    disableComing: false,
    discountCode: "",
    errorMessage: false,
    appliedDiscountCode: false,
    load(discountCode) {
      this.setAppliedButton(discountCode)
      document.addEventListener(`eurus:cart:discount-code:change`, (e) => {
        this.setAppliedButton(discountCode)
      })
    },
    copyCode() {
      if (this.copySuccess) return;

      const discountCode = this.$refs.code_value.textContent.trim();
      navigator.clipboard.writeText(discountCode).then(
        () => {
          this.copySuccess = true;
          const copyEvent = new Event('copy');
          document.dispatchEvent(copyEvent);
          
          setTimeout(() => {
            this.copySuccess = false;
          }, 5000);
        },
        () => {
          alert('Copy fail');
        }
      );
    },
    applyCouponCode(discountCode, isCart=false) {
      Alpine.store('xCouponCodeDetail').discountFaild = false;
      Alpine.store('xCouponCodeDetail').discountApplied = false;
      Alpine.store('xCouponCodeDetail').discountCorrect = false;
      Alpine.store('xCouponCodeDetail').getDiscountCode();
      let appliedDiscountCodes = JSON.parse(JSON.stringify(Alpine.store('xCouponCodeDetail').appliedDiscountCodes));
      const appliedDiscount = document.querySelectorAll(".discount-title:not(.hidden)");
      let checkedDiscount = false;
      if (appliedDiscount.length > 0) {
        appliedDiscount.forEach((discount) => {
          if (discount.innerText.toLowerCase() == discountCode.toLowerCase()) checkedDiscount = true;
        });
      }
      if (freeShippingCodes.includes(this.discountCode)) {
        Alpine.store('xCouponCodeDetail').freeShippingApplied = true;
        setTimeout(() => {
          Alpine.store('xCouponCodeDetail').freeShippingApplied = false;
        }, 5000);
        return;
      }

      if (checkedDiscount) {
        Alpine.store('xCouponCodeDetail').discountApplied = true;
        document.querySelector("#x-cart-discount-field").value = '';
        this.discountCode = '';
        setTimeout(() => {
          Alpine.store('xCouponCodeDetail').discountApplied = false;
        }, 3000);
        return true;
      }
      if (discountCode) {
        let discountCodes = appliedDiscountCodes.length > 0 ? [...new Set([...appliedDiscountCodes, discountCode])].join(",") : discountCode;
        document.cookie = `eurus_discount_code=${discountCodes}; path=/`;
        this.loading = true;
        let cartDrawer = false;
        let cartPage = false;
        fetch(`/checkout?skip_shop_pay=true&discount=${encodeURIComponent(discountCodes)}`)
        .then(() => {
          fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              "sections":  Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id)
            }),
          }).then(response=>{
            return response.json();
          }).then((response) => {
            if (response.status != '422') {
              Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
                const sectionElement = document.querySelector(section.selector);
                if (sectionElement) {
                  if (response.sections[section.id]) {
                    sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
                    if (section.selector == '#CartDrawer' || section.selector == '#main-cart-footer' ) {
                      cartDrawer = getSectionInnerHTML(response.sections[section.id], section.selector);
                    }
                    if(section.selector == '#main-cart-items') {
                      cartPage =  getSectionInnerHTML(response.sections[section.id], section.selector);
                    }
                  }
                }
              }));
              checkedDiscount = false;
              const parser = new DOMParser();
              if (cartPage) {
                const cartPageHtml = parser.parseFromString(cartPage, 'text/html');
                const discountTitleCartPage = cartPageHtml.querySelectorAll(".discount-title:not(.hidden)");
                if (discountTitleCartPage.length > 0) {
                  discountTitleCartPage.forEach((discount) => {
                    if (discount.innerText.toLowerCase() == discountCode.toLowerCase()) checkedDiscount = true;
                  });
                }
              }
              if (cartDrawer) { 
                const cartDrawerHtml = parser.parseFromString(cartDrawer, 'text/html');
                const discountTitle = cartDrawerHtml.querySelectorAll(".discount-title:not(.hidden)");
                if (discountTitle.length > 0) {
                  discountTitle.forEach((discount) => {
                    if (discount.innerText.toLowerCase() == discountCode.toLowerCase()) checkedDiscount = true;
                  });
                }
              }
              if (checkedDiscount) {
                Alpine.store('xCouponCodeDetail').discountCorrect = true;
              } else {
                Alpine.store('xCouponCodeDetail').discountFaild = true;
              }
              Alpine.store('xCouponCodeDetail').appliedDiscountCodes.push(discountCode);
              Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
              document.dispatchEvent(new CustomEvent(`eurus:cart:discount-code:change`));
              if (isCart == false) {
                this.setAppliedButton(discountCode)
                if (Alpine.store('xCartHelper').currentItemCount == 0) {
                  const elementError = this.$el.closest('.promo-code-item').querySelector('.error-message');
                  this.errorMessage = true;
                  elementError.classList.remove('hidden', 'opacity-0');
                  elementError.classList.add('block', 'opacity-100');

                  setTimeout(function() {
                    elementError.classList.remove('block', 'opacity-100');
                    elementError.classList.add('hidden', 'opacity-0');
                  }, 3000);
                } else {
                  this.errorMessage = false;
                  Alpine.store('xMiniCart').openCart();
                }
              }
            }
          }).finally(() => {
            this.loading = false;
            Alpine.store('xCouponCodeDetail').removedDiscountCode = '';
            setTimeout(() => {
              Alpine.store('xCouponCodeDetail').discountFaild = false;
            }, 5000);
            setTimeout(() => {
              Alpine.store('xCouponCodeDetail').discountCorrect = false;
            }, 3000);
          });
        })
        .catch(function(error) {
          console.error('Error:', error);
        })
      }
    },
    handleScheduleCoupon(el) {
      let settings = xParseJSON(el.getAttribute('x-countdown-data'));
      let timeSettings = Alpine.store('xHelper').handleTime(settings);
      if (timeSettings.distance < 0 && settings.set_end_date) {
        this.disableCoupon = true;
      } else if ( timeSettings.startTime > timeSettings.now) {
        this.disableCoupon = true;
        this.disableComing = true;
      }
    },
    onChange() {
      this.discountCode = this.$el.value;
    },
    applyDiscountToCart() {
      this.applyCouponCode(this.discountCode, true);
    },
    undoRemoveDiscount() {
      this.applyCouponCode(Alpine.store('xCouponCodeDetail').removedDiscountCode, true);
    },
    setAppliedButton(discountCode) {
      let appliedDiscountCodes = JSON.parse(JSON.stringify(Alpine.store('xCouponCodeDetail').appliedDiscountCodes))
      if (discountCode && appliedDiscountCodes.indexOf(discountCode) != -1) {
        this.appliedDiscountCode = true;
      } else {
        this.appliedDiscountCode = false;
      }
    }
  }));

  Alpine.store('xCouponCodeDetail', {
    show: false,
    promoCodeDetail: {},
    sectionID: "",
    discountCodeApplied: "",
    appliedDiscountCodes: [],
    removedDiscountCode: '',
    cachedResults: [],
    loading: false,
    cartEmpty: true,
    discountFaild: false,
    discountApplied: false,
    freeShippingApplied: false,
    discountCorrect: false,
    handleCouponSelect(shopUrl) {
      var _this = this;
      const promoCodeDetail = JSON.parse(JSON.stringify(this.promoCodeDetail));

      document.addEventListener('shopify:section:select', function(event) {
        if (event.target.classList.contains('section-promo-code') == false) {
          if (window.Alpine) {
            _this.close();
          } else {
            document.addEventListener('alpine:initialized', () => {
              _this.close();
            });
          }
        }
      })

      if(promoCodeDetail && promoCodeDetail.blockID && promoCodeDetail.sectionID) {
        this.promoCodeDetail = xParseJSON(document.getElementById('x-data-promocode-' + promoCodeDetail.blockID).getAttribute('x-data-promocode'));
        let contentContainer = document.getElementById('PromoCodeContent-' + this.promoCodeDetail.sectionID);
        if (this.cachedResults[this.promoCodeDetail.blockID]) {
          contentContainer.innerHTML = this.cachedResults[this.promoCodeDetail.blockID];
          return true;
        }
        if (this.promoCodeDetail.page != '') {
          let url = `${shopUrl}/pages/${this.promoCodeDetail.page}`;
          fetch(url, {
            method: 'GET'
          }).then(
            response => response.text()
          ).then(responseText => {
            const html = (new DOMParser()).parseFromString(responseText, 'text/html');
            contentContainer.innerHTML = html.querySelector(".page__container .page__body").innerHTML;
          })
        } else if (this.promoCodeDetail.details != '') {
          contentContainer.innerHTML = this.promoCodeDetail.details;
          contentContainer.innerHTML = contentContainer.textContent;
        }
      }
    },
    load(el, blockID, shopUrl) {
      this.promoCodeDetail = xParseJSON(el.closest('#x-data-promocode-' + blockID).getAttribute('x-data-promocode'));
      let contentContainer = document.getElementById('PromoCodeContent-' + this.promoCodeDetail.sectionID);
      this.sectionID = this.promoCodeDetail.sectionID;
      if (this.cachedResults[blockID]) {
        contentContainer.innerHTML = this.cachedResults[blockID];
        return true;
      }
      if (this.promoCodeDetail.page != '') {
        this.loading = true;
        let url = `${shopUrl}/pages/${this.promoCodeDetail.page}`;
        fetch(url, {
          method: 'GET'
        }).then(
          response => response.text()
        ).then(responseText => {
          const html = (new DOMParser()).parseFromString(responseText, 'text/html');
          const content = html.querySelector(".page__container .page__body").innerHTML;
          contentContainer.innerHTML = content;
          this.cachedResults[blockID] = content;
        }).finally(() => {
          this.loading = false;
        })
      } else if (this.promoCodeDetail.details != '') {
        contentContainer.innerHTML = this.promoCodeDetail.details;
        contentContainer.innerHTML = contentContainer.textContent;
      }
    },
    showPromoCodeDetail() {
      this.show = true;
      Alpine.store('xPopup').open = true;
    },
    close() {
      this.show = false;
      Alpine.store('xPopup').close();
    },
    removeDiscountCode(el, isCart=false) {
      Alpine.store('xCouponCodeDetail').discountFaild = false;
      Alpine.store('xCouponCodeDetail').discountApplied = false;
      Alpine.store('xCouponCodeDetail').discountCorrect = false;
      
      this.getDiscountCode();

      const discountCode = el.closest('li.x-discount').querySelector('.discount-title:not(.hidden)').textContent.toLowerCase();

      let discountIndex = this.appliedDiscountCodes.findIndex(code => code.toLowerCase() === discountCode);
      if (discountIndex !== -1) {
        this.appliedDiscountCodes.splice(discountIndex, 1);
      } 
      document.cookie = `eurus_discount_code=${this.appliedDiscountCodes}; path=/`;

      this.loading = true;
      let cartDrawer = false;
      let cartPage = false;
      let checkoutUrl = '';
      if (this.appliedDiscountCodes.length > 0) {
        checkoutUrl = `/checkout?skip_shop_pay=true&discount=${encodeURIComponent(this.appliedDiscountCodes)}`;
      } else {
        checkoutUrl = '/checkout?skip_shop_pay=true&discount=false';
      }
      fetch(checkoutUrl)
      .then(() => {
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            "sections":  Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id)
          }),
        }).then(response=>{
          return response.json();
        }).then((response) => {
          if (response.status != '422') {
            Alpine.store('xCartHelper').getSectionsToRender().forEach((section => {
              const sectionElement = document.querySelector(section.selector);
              if (sectionElement) {
                if (response.sections[section.id]) {
                  sectionElement.innerHTML = getSectionInnerHTML(response.sections[section.id], section.selector);
                  if (section.selector == '#CartDrawer' || section.selector == '#main-cart-footer' ) {
                    cartDrawer = getSectionInnerHTML(response.sections[section.id], section.selector);
                  }
                  if(section.selector == '#main-cart-items') {
                    cartPage =  getSectionInnerHTML(response.sections[section.id], section.selector);
                  }
                }
              }
            }));
            Alpine.store('xCartHelper').currentItemCount = parseInt(document.querySelector('#cart-icon-bubble span').innerHTML);
            document.dispatchEvent(new CustomEvent(`eurus:cart:discount-code:change`));
            if (isCart == false) {
              this.setAppliedButton(discountCode)
              if (Alpine.store('xCartHelper').currentItemCount == 0) {
                const elementError = this.$el.closest('.promo-code-item').querySelector('.error-message');
                this.errorMessage = true;
                elementError.classList.remove('hidden', 'opacity-0');
                elementError.classList.add('block', 'opacity-100');

                setTimeout(function() {
                  elementError.classList.remove('block', 'opacity-100');
                  elementError.classList.add('hidden', 'opacity-0');
                }, 3000);
              } else {
                this.errorMessage = false;
                Alpine.store('xMiniCart').openCart();
              }
            }
          }
        }).finally(() => {
          this.loading = false;
          this.removedDiscountCode = discountCode;
          setTimeout(() => {
            Alpine.store('xCouponCodeDetail').discountFaild = false;
          }, 5000);
          setTimeout(() => {
            Alpine.store('xCouponCodeDetail').discountCorrect = false;
          }, 3000);
        });
      })
      .catch(function(error) {
        console.error('Error:', error);
      })
    },
    clearRemovedDiscount() {
      this.removedDiscountCode = '';
    },
    getDiscountCode() {
      let cookieValue = document.cookie.match('(^|;)\\s*' + 'eurus_discount_code' + '\\s*=\\s*([^;]+)');
      let appliedDiscountCodes = cookieValue ? cookieValue.pop() : '';
      if (appliedDiscountCodes) {
        this.appliedDiscountCodes = appliedDiscountCodes.split(",");
      }
    }
  });

  Alpine.data('xImageComparison', (sectionId, layout) => ({
    load(e) {
      if (layout == "horizontal") {
        this.$refs.image.style.setProperty('--compare_' + sectionId, e.target.value + '%');
      } else {
        this.$refs.image.style.setProperty('--compare_vertical_' + sectionId, 100 - e.target.value + '%');
      }
    },
    resizeWindow(el) {
      addEventListener("resize", () => {
        this.setMinMaxInput(el, layout);
      });
    },
    disableScroll(el) {
      let isfocus = true;
      window.addEventListener('wheel', () => {
        if (isfocus) {
          el.blur();
          isfocus = false;
        }
      });
    },
    setMinMaxInput(el) {
      el.min = 0;
      el.max = 100;
    },
    animateValue(el) {
      const targetValue = parseFloat(el.value);
      let currentHorizontalValue = 100;
      let currentVerticalValue = 0; 
      const totalDuration = 1000;
      let startTime = null; 
    
      const easeInOutSlowEnd = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsedTime = timestamp - startTime;
        const progress = Math.min(elapsedTime / totalDuration, 1);
    
        const easedProgress = easeInOutSlowEnd(progress);
    
        if (layout === "horizontal") {
          currentHorizontalValue = 100 + (targetValue - 100) * easedProgress; 
          el.value = currentHorizontalValue.toFixed(2);
          this.$refs.image.style.setProperty('--compare_' + sectionId, currentHorizontalValue + '%');
    
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.value = targetValue; 
            this.$refs.image.style.setProperty('--compare_' + sectionId, targetValue + '%');
          }
        } else {
          currentVerticalValue = 0 + (targetValue - 0) * easedProgress; 
          el.value = currentVerticalValue.toFixed(2);
          this.$refs.image.style.setProperty('--compare_vertical_' + sectionId, currentVerticalValue + '%');
    
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            el.value = targetValue;
            this.$refs.image.style.setProperty('--compare_vertical_' + sectionId, targetValue + '%');
          }
        }
      };
    
      requestAnimationFrame(step);
    }        
  }));
  Alpine.store('xProductComparisonPopup', {
    loadTablet(el, url) {
      if(url) {
        fetch(url)
          .then(response => response.text())
          .then(text => {
            const html = document.createElement('div');
            html.innerHTML = text;
            const recommendations = html.querySelector('.product-comparison-table');
            if (recommendations && recommendations.innerHTML.trim().length) {
              requestAnimationFrame(() => {
                el.innerHTML = recommendations.innerHTML;
                el.querySelectorAll('.content-tablet').forEach((item) => {
                  if (el.querySelector('.'+item.dataset.selectHtml)) {
                    el.querySelector('.'+item.dataset.selectHtml).innerHTML += item.innerHTML;
                  }
                });
              });
            }
          }).catch(e => {console.error(e);});
      }else {
        el.querySelectorAll('.content-tablet').forEach((item) => {
          if (el.querySelector('.'+item.dataset.selectHtml)) {
            el.querySelector('.'+item.dataset.selectHtml).innerHTML += item.innerHTML;
          }
        });
      }
    }
  });
  Alpine.data('xProductCard', (
    sectionId,
    productUrl,
    productId,
  ) => ({
    currentVariantCard: '',
    options: [],
    isSelect: false,
    productId: productId,
    showOptions: false,
    init() {          
      document.addEventListener(`eurus:product-card-variant-select:updated:${sectionId}`, (e) => {
        this.checkVariantSelected();
        this.currentVariantCard = e.detail.currentVariant;
        this.options = e.detail.options;
      });
    },
    checkVariantSelected() {
      const fieldset = [...document.querySelectorAll(`#variant-update-${sectionId} fieldset`)];
      if(fieldset.findIndex(item => !item.querySelector("input:checked")) == "-1") {
        this.isSelect = true;
      }
    }
  }));

  Alpine.store('xPreviewColorSwatch', {
    onChangeVariant(el, productUrl, src, variantId, sectionId, isColor = false) {
      setTimeout(() => {
        document.addEventListener(`eurus:product-card-variant-select:updated:${sectionId}`, (e) => {
          if (e.detail.currentVariant == null) {
            this.updateImage(el, productUrl, src, variantId, sectionId);
          }
        });

        if (!isColor) {
          let productVariants = ''

          document.dispatchEvent(new CustomEvent(`eurus:product-variant-get:${sectionId}`, {
            detail: {
              callback: (variants) => {
                productVariants = variants;
              }
            }
          }));

          if (productVariants) {
            let variantSrc = productVariants.reduce((acc, variant) => {
              if (variant.featured_image) {
                acc[variant.id] = variant.featured_image.src;
              }
              return acc;
            }, {});
    
            const swatchesContainer = el.closest('.options-container');
            if (swatchesContainer) {
              const swatches = swatchesContainer.querySelectorAll('label.color-watches');
              const inputs = swatchesContainer.querySelectorAll('input:checked');
  
              let selectedOption = [];
  
              inputs.forEach(input => { 
                if (![...swatches].some(swatch => swatch.dataset.optionvalue === input.value)) {
                  selectedOption.push(input.value);
                }
              });
  
              let imageSrc = productVariants
                .filter(variant => selectedOption.every(option => variant.options.includes(option)))
                .map(variant => `url(${variantSrc[variant.id] ? variantSrc[variant.id] : src})`);
              
              swatches.forEach((swatch, index) => {
                swatch.style.setProperty('--bg-image',  imageSrc[index]);
              });
            }
          }
        } 
      }, 0) // INP
    },

    updateImage(el, productUrl, src, variantId, sectionId, hasVariant) {
      const cardProduct = el.closest('.card-product');
      let getLink =  productUrl + `?variant=${variantId}`;
      if (!cardProduct) return;
      const linkVariant = cardProduct.getElementsByClassName("link-product-variant");
      for (var i = 0; i < linkVariant.length; i ++) {
        linkVariant[i].setAttribute("href", getLink);
      }
      const currentVariant = cardProduct.querySelector(".current-variant");
      if (currentVariant && !hasVariant) {
        currentVariant.innerText = variantId;
      }

      if (src != '') {
        let media = cardProduct.querySelector(`[media="${src}"]`);
        if (media) {
          let index = media.getAttribute('index');
          let slide = cardProduct.querySelector('.x-splide');
          if (slide) {
            if (slide.splide) {
              slide.splide.go(Number(index));
            } else {
              document.addEventListener(`eurus:${sectionId}:splide-ready`, () => {
                slide.splide.go(Number(index));
              });
            }
            return;
          } 
        }
        const previewImg = cardProduct.getElementsByClassName("preview-img")[0];
        if (!previewImg) return;
        previewImg.removeAttribute("srcset");
        previewImg.setAttribute("src", src);
        let slide = cardProduct.querySelector('.x-splide');
        if (slide && slide.splide) {
          slide.splide.go(0);
        }
      } else {
        let slide = cardProduct.querySelector('.x-splide');
        if (slide && slide.splide) {
          slide.splide.go(0);
        }
      }
    },

    updateQuickAdd(productUrl, variantId, quickAddPageParam, productId, el){
      return;
      let url = `${productUrl}?variant=${variantId}&section_id=choose-option&page=${quickAddPageParam}`
      fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const listCurrent = document.querySelectorAll(`#product-form-choose-option${productId}${quickAddPageParam ?? ''}`);
        const destination = html.querySelector(`#product-form-choose-option${productId}${quickAddPageParam ?? ''}`);
        if (listCurrent.length > 0 && destination) {
          listCurrent.forEach((item)=>{
            const currentPrice = item.closest('.card-product').querySelector(".main-product-price");
            const updatePrice = html.querySelector(".main-product-price");
            if(currentPrice && updatePrice){
              currentPrice.innerHTML = updatePrice.innerHTML
            }
          })
        } else {
          if (listCurrent.length > 0) {
            listCurrent.forEach((item) => {
              item.innerHTML = html.querySelector('.form').innerHTML;
            })
          }
          const currentPrice = el?.closest('.card-product')?.querySelector(".main-product-price");
          const updatePrice = html.querySelector(".main-product-price");
          if(currentPrice && updatePrice){
            currentPrice.innerHTML = updatePrice.innerHTML
          }
        }
      })
    }
  });
});
requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xEventCalendar', (event) => ({
      open: false,
      eventDetails: {},
      addToCal(options) {
        let link = "";
        let timeEnd = ""
        this.eventDetails = event;

        if(!event) {
          this.eventDetails = JSON.parse(JSON.stringify(Alpine.store("xEventCalendarDetail").eventDetail))
        }

        let timeStart = this.handleTime(this.eventDetails.start_year, this.eventDetails.month, this.eventDetails.day, this.eventDetails.start_hour, this.eventDetails.start_minute, options);

        if (this.eventDetails.show_end_date) {
          timeEnd = this.handleTime(this.eventDetails.end_year, this.eventDetails.end_month, this.eventDetails.end_day, this.eventDetails.end_hour, this.eventDetails.end_minute, options);
        } 
        else if (this.eventDetails.show_end_time) {
          timeEnd = this.handleTime(this.eventDetails.start_year, this.eventDetails.month, this.eventDetails.day, this.eventDetails.end_hour, this.eventDetails.end_minute, options);
        }
        else {
          timeEnd = timeStart;
        }

        switch (options) {
          case 'apple':
            this.createDownloadICSFile(0, timeStart, timeEnd, this.eventDetails.title, this.eventDetails.details, this.eventDetails.location, "apple");
            break;
          case 'google':
            link = "http://www.google.com/calendar/event?action=TEMPLATE&trp=false" + "&text=" + encodeURIComponent(this.eventDetails.title) + "&dates=" + timeStart + "/" +  timeEnd + "&location=" + encodeURIComponent(this.eventDetails.location) + "&details=" + encodeURIComponent(this.eventDetails.details);
            window.open(link);
            break;
          case 'outlook':
            link = "https://outlook.live.com/calendar/action/compose?rru=addevent" + "&startdt=" + timeStart + "&enddt=" + timeEnd + "&subject=" + encodeURIComponent(this.eventDetails.title) + "&location=" + encodeURIComponent(this.eventDetails.location) + "&body=" + encodeURIComponent(this.eventDetails.details);
            window.open(link)
            break;
          case 'yahoo':
            link = "http://calendar.yahoo.com/?v=60" + "&st=" + timeStart + "&et=" +  timeEnd + "&title=" + encodeURIComponent(this.eventDetails.title);
            window.open(link)
            break;
          case 'ical': 
            this.createDownloadICSFile(0, timeStart, timeEnd, this.eventDetails.title, this.eventDetails.details, this.eventDetails.location, "ical");
            break;
          default:
            console.log(`Sorry, error`);
        }
      },
      handleTime(year,month,day,hour,minute,options) {
        let date = new Date();

        if (options == 'google' || options == 'yahoo') {
          date = new Date(Date.UTC(year, this.getMonthNumber(month), parseInt(day), parseInt(hour), parseInt(minute)));
          date.setTime(date.getTime() + (-1 * parseFloat(this.eventDetails.timezone) * 60 - date.getTimezoneOffset()) * 60 * 1000)
          return date.toISOString().split("Z")[0].replace(".000", "").replace(/[^A-Z0-9]/ig, "");
        } else {
          date = new Date(year, this.getMonthNumber(month), parseInt(day), parseInt(hour), parseInt(minute));
          date.setTime(date.getTime() + (-1 * parseFloat(this.eventDetails.timezone) * 60 - date.getTimezoneOffset()) * 60 * 1000)
          if ( options == 'apple' ) {
            return date.toISOString().split("Z")[0].replace(".000", "").replace(/[^A-Z0-9]/ig, "");
          } else {
            return date.toISOString();
          }
        }
      },
      getMonthNumber(month) {
        return new Date(`${month} 1, 2022`).getMonth();
      },
      createDownloadICSFile(timezone, timeStart, timeEnd, title, description, location, type) {
        let icsBody = "BEGIN:VCALENDAR\n" +
        "VERSION:2.0\n" +
        "PRODID:Calendar\n" +
        "CALSCALE:GREGORIAN\n" +
        "METHOD:PUBLISH\n" +
        "BEGIN:VTIMEZONE\n" +
        "TZID:" + timezone + "\n" +
        "END:VTIMEZONE\n" +
        "BEGIN:VEVENT\n" +
        "SUMMARY:" + title + "\n" +
        "UID:@Default\n" +
        "SEQUENCE:0\n" +
        "STATUS:CONFIRMED\n" +
        "TRANSP:TRANSPARENT\n" +
        "DTSTART;TZID=" + timezone + ":" + timeStart + "\n" +
        "DTEND;TZID=" + timezone + ":" + timeEnd + "\n" +
        "LOCATION:" + location + "\n" +
        "DESCRIPTION:" + description + "\n" +
        "END:VEVENT\n" +
        "END:VCALENDAR\n";

        this.download(title + ".ics", icsBody, type);
      },
      download(filename, fileBody, type) {
        var element = document.createElement("a");

        if (type == "ical") {
          element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(fileBody));
        } else if (type == "apple") {
          var file = new Blob([fileBody], { type: "text/calendar;charset=utf-8"})
          element.href = window.URL.createObjectURL(file)
        }

        element.setAttribute("download", filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    }));

    Alpine.store('xEventCalendarDetail', {
      show: false,
      eventDetail: {},
      handleEventSelect() {
        var _this = this;
        const eventDetail = JSON.parse(JSON.stringify(this.eventDetail));

        document.addEventListener('shopify:section:select', function(event) {
          if (event.target.classList.contains('section-event-calendar') == false) {
            if (window.Alpine) {
              _this.close();
            } else {
              document.addEventListener('alpine:initialized', () => {
                _this.close();
              });
            }
          }
        })
        
        if(eventDetail && eventDetail.blockID && eventDetail.sectionID) {
          this.eventDetail = xParseJSON(document.getElementById('x-data-event-' + eventDetail.blockID).getAttribute('x-event-data'));
          let element = document.getElementById('EventDescription-' + this.eventDetail.sectionID);
          element.innerHTML = this.eventDetail.description;
          element.innerHTML = element.textContent;
        }
      },
      load(el, blockID) {
        this.eventDetail = xParseJSON(el.closest('#x-data-event-' + blockID).getAttribute('x-event-data'));
        let element = document.getElementById('EventDescription-' + this.eventDetail.sectionID);
        this.sectionID = this.eventDetail.sectionID;
        element.innerHTML = this.eventDetail.description;
        element.innerHTML = element.textContent;
        this.showEventCalendarDetail();
      },
      showEventCalendarDetail() {
        this.show = true;
        Alpine.store('xPopup').open = true;
      },
      close() {
        this.show = false;
        Alpine.store('xPopup').close();
      }
    });
  })
})

requestAnimationFrame(() => {
  document.addEventListener('alpine:init', () => {
    Alpine.data('xCustomizePicker', () => ({
      dataCheckbox: [],
      disableInput: true,
      radioChecked: '',
      validation(el) {
        if (el.value == "") {
          el.classList.add("required-picker");
        }
        else {
          el.classList.remove("required-picker");
        }
        this.validateErrorBtn(el);
      },
      validateErrorBtn(el) {
        var productInfo = el.closest('.product-info');
        var paymentBtn = productInfo.querySelector(".payment-button--clone");
        var propertiesInput = productInfo.querySelectorAll(".customization-picker.required-picker");
        if (propertiesInput.length) {
          paymentBtn?.classList.remove('hidden');
        }
        else {
          paymentBtn?.classList.add('hidden');
        }
      },
      setValueBlank(el) {
        if (el.value == '') {
          this.disableInput = true;
        } else {
          this.disableInput = false;
        }
      },
      validateErrorAddAsBundle(el) {
        var productInfo = el.closest('.product-info');
        var propertiesInput = productInfo.querySelectorAll(".customization-picker");
        var optionValid = true;
        propertiesInput.length && propertiesInput.forEach((input) => {
          if (input.required && input.value == '' || input.classList.contains("validate-checkbox")) {
            input.classList.add("required-picker");
            if (optionValid) optionValid = false;
          }
        });
        return optionValid;
      },
      validateError(el) {
        var productInfo = el.closest('.product-info');
        var propertiesInput = productInfo.querySelectorAll(".customization-picker");
        let scrollStatus = false;
        var optionValid = true;
        propertiesInput.length && propertiesInput.forEach((input) => {
          if (input.required && input.value.trim() == '' || input.classList.contains("validate-checkbox")) {
            input.classList.add("required-picker");
            if(!scrollStatus){
              input.parentElement.querySelector('.text-required').scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
              scrollStatus = true;
            }              
          }
        });
        
        return optionValid;
      },
      validateCheckBox(el, minLimit, maxLimit) {
        var groupCheckbox = el.closest(".customize-checkbox");
        const checkedInputs = groupCheckbox.querySelectorAll('input[type=checkbox]:checked');
        if (checkedInputs.length >= minLimit ) {
          el.classList.remove('required-picker', 'validate-checkbox');
        } else {
          el.classList.add('required-picker', 'validate-checkbox');
        }

        if (maxLimit > 0 && maxLimit >= minLimit) {
          const disableInput = checkedInputs.length >= maxLimit;
          const uncheckedInputs = groupCheckbox.querySelectorAll('input[type=checkbox]:not(:checked)');
          uncheckedInputs.forEach((uncheckedInput) => {
            uncheckedInput.disabled = disableInput;
          });
        }
        if (minLimit > 0) {
          this.validateErrorBtn(el);
        }
      },
      setDragAndDrop(el) {
        const inputElement = el.querySelector('.drop-zone__input');
        const dropZoneWrapElm = inputElement.closest('.drop-zone-wrap');
        const dropZoneElement = dropZoneWrapElm.querySelector('.drop-zone');
    
        dropZoneElement.addEventListener('click', (e) => {
          inputElement.click();
        });
    
        inputElement.addEventListener('change', (e) => {
          if (inputElement.files.length) {
            const dropZone = inputElement.closest('.drop-zone-wrap');
            const file = inputElement.files[0];
            const filesize = ((file.size/1024)/1024).toFixed(4);
    
            dropZone.classList.remove('drop-zone-wrap--error');
            inputElement.classList.remove('required-picker');
            if (filesize > 5) {
              inputElement.value = '';
              dropZone.classList.add('drop-zone-wrap--error');
              setTimeout(()=> {
                dropZone.classList.remove('drop-zone-wrap--error');
              },3000);
              return;
            }
            this.preview(dropZoneWrapElm, file);
          }
        });
    
        dropZoneElement.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropZoneElement.classList.add('drop-zone--over');
        });
    
        ["dragleave", "dragend"].forEach((type) => {
          dropZoneElement.addEventListener(type, (e) => {
            dropZoneElement.classList.remove('drop-zone--over');
          });
        });
    
        dropZoneElement.addEventListener('drop', (e) => {
          e.preventDefault();
    
          if (e.dataTransfer.files.length) {
            inputElement.files = e.dataTransfer.files;
            this.preview(dropZoneWrapElm, e.dataTransfer.files[0]);
          }
    
          dropZoneElement.classList.remove('drop-zone--over');
        });
      },
      preview(dropZoneWrapElm, file) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          let thumbnailElement = dropZoneWrapElm.querySelector('.drop-zone__thumb');
          let preview = dropZoneWrapElm.querySelector('.dd-thumbnail');
          let previewIcon = preview.querySelector('.icon-file');
          let fileInfo = dropZoneWrapElm.querySelector('.dd-file-info');
    
          dropZoneWrapElm.classList.add('drop-zone-wrap--inactive');
          const spanFileName = fileInfo.querySelector('.dd-file-info__title');
          const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          spanFileName.textContent = fileName;
          const spanFileType = fileInfo.querySelector('.dd-file-info__type');
          spanFileType.textContent = `${this.formatFileType(file)} • ${this.calculateSize(file)}`;
    
          preview.removeAttribute('style');
          previewIcon.classList.add('hidden');
    
          if ( /\.(jpe?g|png|gif|webp)$/i.test(file.name) ) {
            preview.setAttribute('style',`background-image:url("${reader.result}");`);
          } else {
            previewIcon.classList.remove('hidden');
          }
    
          thumbnailElement.setAttribute('data-ts-file', file.name);
        }, false);
        
        reader.readAsDataURL(file);
      },
      removeFile(evt, el) {
        evt.preventDefault();
        const dropZoneWrapElm = el.closest('.drop-zone-wrap');
        const inputElm = dropZoneWrapElm.querySelector('.drop-zone__input');
        
        inputElm.value = '';
        dropZoneWrapElm.classList.remove('drop-zone-wrap--inactive');
        this.disableInput = true;
      },
      formatFileType(file) {
        const type = file.type;
        const splitType = type.split('/');
        const subtype = splitType[1];
        let formattedType = subtype;
        let handleSubtype = subtype.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').replace(/^-/, '');
        const applicationType = {
          'pdf': subtype.toUpperCase(),
          'vnd-ms-excel': 'Excel',
          'vnd-openxmlformats-officedocument-spreadsheetml-sheet': 'Excel',
          'vnd-ms-powerpoint': 'PowerPoint',
          'vnd-openxmlformats-officedocument-presentationml-presentation': 'PowerPoint',
          'x-msvideo': 'AVI',
          'html': 'HTML',
          'msword': 'Word',
          'vnd-openxmlformats-officedocument-wordprocessingml-document': 'Word',
          'csv': 'CSV',
          'mpeg': 'MP3 Audio',
          'webm': 'WEBM Audio',
          'mp4-video': 'MP4 Video',
          'mpeg-video': 'MPEG Video',
          'webm-video': 'WEBM Video',
          'vnd-rar': 'RAR archive',
          'rtf': 'RTF',
          'plain': 'Text',
          'wav': 'WAV',
          'vnd-adobe-photoshop': 'Adobe Photoshop',
          'postscript': 'Adobe Illustrator'
        };
    
        if (type.startsWith('image/')) {
          if (applicationType[handleSubtype]) {
            formattedType = applicationType[handleSubtype];
          } else {
            formattedType = splitType[1].toUpperCase();
            formattedType = `${formattedType} Image`;
          }
        } else if (type.startsWith('video/')) {
          const handleVideoSubtype = `${handleSubtype}-video`
          if (applicationType[handleVideoSubtype]) formattedType = applicationType[handleVideoSubtype];
        } else {
          if (applicationType[handleSubtype]) formattedType = applicationType[handleSubtype];
        }
    
        return formattedType;
      },
      calculateSize(file) {
        let numberOfBytes = file.size;
        if (numberOfBytes === 0) return 0;
    
        const units = [
          "B",
          "KB",
          "MB",
          "GB",
          "TB",
          "PB",
          "EB",
          "ZB",
          "YB"
        ];
    
        const exponent = Math.min(
          Math.floor(Math.log(numberOfBytes) / Math.log(1024)),
          units.length - 1,
        );
        const approx = numberOfBytes / 1024 ** exponent;
        const output =
          exponent === 0
            ? `${numberOfBytes} bytes`
            : `${approx.toFixed(2)} ${units[exponent]}`;
    
        return output;
      }
    }));

    Alpine.data("xProductTabs", () => ({
      open: 0, 
      openMobile: false, 
      tabActive: '',
      setTabActive() {
        const tabActive = this.$el.dataset.tabtitle;
        this.tabActive = tabActive;
      }
    }));
  });
});

requestAnimationFrame(() => {
  document.addEventListener("alpine:init", () => {
    Alpine.data('xProductBundle', (
      sectionId,
      minimumItems,
      shopCurrency,
      discountType,
      discountValue,
      applyDiscountOncePerOrder
    ) => ({
      products: "",
      productsBundle: [],
      loading: false,
      addToCartButton: "",
      totalPrice: 0,
      errorMessage: false,
      showBundleContent: false,
      totalDiscount: 0,
      amountPrice: 0,
      initBundle(el) {
        this.addToCartButton = el.querySelector(".button-atc");
        this.handleProductsBundle();
      },
      handleProductsBundle() {
        this.$watch('productsBundle', () => {
          document.dispatchEvent(new CustomEvent(`eurus:product-bundle:productsList-changed-${sectionId}`, {
            detail: {
              productsBundle: this.productsBundle
            }
          }));
        });
      },
      addToBundle(el, productId, productUrl, hasVariant, name_edt) {
        let productsBundle = JSON.parse(JSON.stringify(this.productsBundle))
        const productName = el.closest(".x-product-bundle-data").querySelector(".product-name").textContent;
        const currentVariant =  JSON.parse(el.closest(".x-product-bundle-data").querySelector(".current-variant").textContent);
        const price =  !hasVariant && JSON.parse(el.closest(".x-product-bundle-data").querySelector(".current-price")?.textContent);
        const featured_image = currentVariant.featured_image ? currentVariant.featured_image.src : el.closest(".x-product-bundle-data").querySelector(".featured-image").textContent;
        const edtElement = el.closest(".x-product-bundle-data").querySelector('.hidden.cart-edt-properties');
        let shippingMessage = '';
        if(edtElement){
          shippingMessage = edtElement.value.replace("time_to_cut_off", Alpine.store('xEstimateDelivery').noti);
        }
        const preorderElement = el.closest(".x-product-bundle-data").querySelector('.hidden.preorder-edt-properties');
        let preorderMessage = '';
        if(preorderElement){
          preorderMessage = preorderElement.value;
        }
        
        const properties = {
          ...(name_edt && shippingMessage && { [name_edt]: shippingMessage }),
          ...(preorderMessage && { Preorder: preorderMessage }),
        };

        let variantId = hasVariant ? currentVariant.id : currentVariant; 
        let newProductsBundle = [];
        let newItem = hasVariant ? { ...currentVariant, title: currentVariant.title.replaceAll("\\",""), product_id: productId, product_name: productName, productUrl: `${productUrl}?variant=${currentVariant.id}`, featured_image: featured_image, quantity: 1, "properties": properties} : { id: variantId, product_id: productId, product_name: productName, productUrl: productUrl, featured_image: featured_image, quantity: 1, price: price, "properties": properties }
        
        newProductsBundle = [...productsBundle , newItem];
        this.productsBundle = newProductsBundle;
        this.errorMessage = false;
        this.updateBundleContent(newProductsBundle)
      },
      handleAddToCart(el) {
        this.loading = true;

        setTimeout(() => { 
          let items = JSON.parse(JSON.stringify(this.productsBundle));
          items = items.reduce((data, product) => {
            data[product.id] ? data[product.id].quantity += product.quantity : data[product.id] = product;
            return data;
          }, {});
          
          fetch(window.Shopify.routes.root + 'cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body:  JSON.stringify({ "items": items, "sections":  Alpine.store('xCartHelper').getSectionsToRender().map((section) => section.id) })
          }).then((response) => {
            return response.json();
          }).then((response) => {

            document.dispatchEvent(new CustomEvent(`eurus:product-bundle:products-changed-${sectionId}`, {
              detail: {
                productsBundle: Object.values(items),
                el: el.closest(".product-bundler-wrapper")
              }
            }));

            if (response.status == '422') {
              const error_message = el.closest('.bundler-sticky').querySelector('.cart-warning');

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
          })
          .catch((error) => {
            console.error('Error:', error);
          }).finally(() => {
            this.loading = false;
            this.productsBundle = [];
            this.totalPrice = 0;
            this.addToCartButton.setAttribute('disabled', 'disabled');
          })
        }, 0)
      },
      updateBundleContent(productsBundle) {
        let total = productsBundle.map(item => item.price).reduce((total, item) => total + item, 0);
        
        if (productsBundle.length >= minimumItems) {
          this.addToCartButton.removeAttribute('disabled');
          let discount = 0;
          let totalDiscount = 0;

          if (!Number.isNaN(discountValue)) {
            discount = Number(discountValue);

            if (discountType == 'percentage' && Number.isInteger(discount) && discount > 0 && discount < 100) {
              totalDiscount = Math.ceil(total - total * discount / 100);
            }

            if (discountType == 'amount' && discount > 0) {
              discount = (Number.parseFloat(discountValue)).toFixed(2);
              if (applyDiscountOncePerOrder) {
                totalDiscount = total - discount * Shopify.currency.rate * 100;
              } else {
                totalDiscount = total - productsBundle.length * discount * Shopify.currency.rate * 100;
              }
            }

            if (totalDiscount > 0) {
              let amount = total - totalDiscount;
              this.amountPrice = this.formatMoney(amount, shopCurrency);
              this.totalDiscount = this.formatMoney(totalDiscount, shopCurrency);
            } else {
              this.amountPrice = this.formatMoney(0, shopCurrency);
              this.totalDiscount = this.formatMoney(total, shopCurrency)
            }
          } else {
            this.amountPrice = 0;
            this.totalDiscount = 0;
          }
        } else {
          this.totalDiscount = 0;
          this.addToCartButton.setAttribute('disabled', 'disabled');
        }
        this.totalPrice = this.formatMoney(total, shopCurrency);
      },
      removeBundle(el, indexItem) {
        let item = this.productsBundle[indexItem]
        let newProductsBundle = this.productsBundle.filter((item, index) => index != indexItem)
        this.productsBundle = newProductsBundle;
        this.updateBundleContent(newProductsBundle);

        document.dispatchEvent(new CustomEvent(`eurus:product-bundle:remove-item-${sectionId}`, {
          detail: {
            item: item,
            el: el
          }
        }));
      },
      formatWithDelimiters(number, precision, thousands, decimal) {
        precision = this.defaultOption(precision, 2);
        thousands = this.defaultOption(thousands, ',');
        decimal   = this.defaultOption(decimal, '.');
    
        if (isNaN(number) || number == null) { return 0; }
        number = (number/100.0).toFixed(precision);
    
        var parts   = number.split('.'),
            dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
            cents   = parts[1] ? (decimal + parts[1]) : '';
    
        return dollars + cents;
      },
      defaultOption(opt, def) {
        return (typeof opt == 'undefined' ? def : opt);
      },
      formatMoney(amount, formatString) {
        var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
        switch(formatString.match(placeholderRegex)[1]) {
          case 'amount':
            value = this.formatWithDelimiters(amount, 2);
            break;
          case 'amount_no_decimals':
            value = this.formatWithDelimiters(amount, 0);
            break;
          case 'amount_with_comma_separator':
            value = this.formatWithDelimiters(amount, 2, '.', ',');
            break;
          case 'amount_no_decimals_with_comma_separator':
            value = this.formatWithDelimiters(amount, 0, '.', ',');
            break;
        }
        return formatString.replace(placeholderRegex, value);
      },
      displayDiscountValueLabel () {
        let discount = 0;
        if (!Number.isNaN(discountValue)) {
          discount = Number(discountValue);
          if (discount > 0) {
            discount = (Number.parseFloat(discountValue)).toFixed(2) * Shopify.currency.rate * 100;
          }
          return this.formatMoney(discount, shopCurrency);
        }
      }
    }));

    Alpine.data('xProductItemBundle', (
      sectionId,
      addToBundle,
      handleSectionId,
      productUrl,
      productId,
      hasVariant,
      productOnlyAddedOnce
    ) => ({
      dataVariant: [],
      currentVariant: '',
      isSelect: false,
      productId: productId,
      productUrl: productUrl,
      initVariant() {
        let xDataVariant = this.$el.querySelector('[type="application/json"]');
        if (xDataVariant) {
          let data = JSON.parse(xDataVariant.textContent);
          data = data?.map(item => ({ disable: false, id: item.id }));
          this.dataVariant = data;
        }
        this.initEvent();
      },
      initEvent() {
        if (hasVariant) {
          document.addEventListener(`eurus:product-card-variant-select:updated:${sectionId}`, (e) => {
            this.currentVariant = e.detail.currentVariant,
            this.options = e.detail.options;
            this.renderAddToBundleButton();
            this.checkVariantSelected();
            if (this.currentVariant && this.currentVariant.id) {
              this.productUrl = productUrl + `/?variant=${this.currentVariant.id}`
            }
          });
        }

        document.addEventListener(`eurus:product-bundle:products-changed-${handleSectionId}`, (e) => {
          e.detail.productsBundle.map(item => {
            if(hasVariant && item.product_id == this.productId && this.currentVariant.available) {
              let buttonATC = document.querySelector('#x-atc-button-' + sectionId);
              if (buttonATC) buttonATC.removeAttribute('disabled');
            } else if(item.product_id == this.productId) {
              let buttonATC = document.querySelector('#x-atc-button-' + sectionId);
              if (buttonATC) buttonATC.removeAttribute('disabled');
            }
          })
          if(productOnlyAddedOnce) {
            this.setUnSelectVariant();
          }
        })

        document.addEventListener(`eurus:product-bundle:remove-item-${handleSectionId}`, (e) => {
          if (this.isSelect && e.detail.item.product_id == this.productId && hasVariant) {
            if (this.currentVariant && this.currentVariant.available) {
              let buttonATC = document.querySelector('#x-atc-button-' + sectionId);
              if (buttonATC) buttonATC.removeAttribute('disabled');
            }
            this.setUnSelectVariant(e.detail.item);
          } else if(e.detail.item.product_id == this.productId) { 
            let buttonATC = document.querySelector('#x-atc-button-' + sectionId);
            if (buttonATC) buttonATC.removeAttribute('disabled');

            if(productOnlyAddedOnce) {
              const cardProducts = document.querySelector('#bundle-product-' + e.detail.item.product_id);
              cardProducts?.classList.remove("cursor-pointer", "pointer-events-none", "opacity-70")
            }
          }
        })
      },
      setVariantSelected(el) {
        if (this.currentVariant && this.dataVariant.findIndex(item => (item.id == this.currentVariant.id && item.disable)) != -1) {
          let buttonATB = el.closest('.bundle-product').querySelector('.x-atb-button');
          buttonATB.setAttribute('disabled', 'disabled');
        }
      },
      setDisableSelectProduct(el) {
        if (productOnlyAddedOnce) {
          let newVariants = JSON.parse(JSON.stringify(this.dataVariant)).map(item => (item.id == this.currentVariant.id) ? { id: item.id, disable: true } : { id: item.id, disable: item.disable})
          this.dataVariant = newVariants;
          let buttonATB = el.closest('.bundle-product').querySelector('.x-atb-button');
          buttonATB.setAttribute('disabled', 'disabled');
        }
      },
      setUnSelectVariant(product) {
        let newVariants = "";
        if (product) {
          newVariants = JSON.parse(JSON.stringify(this.dataVariant)).map(item => (item.id == product.id) ? { id: item.id, disable: false } : { id: item.id, disable: item.disable})
        } else {
          newVariants = JSON.parse(JSON.stringify(this.dataVariant)).map(item => ({ id: item.id, disable: false }))
        }
        this.dataVariant = newVariants;
      },
      renderAddToBundleButton() {
        const buttonATB = document.getElementById('x-atc-button-' + sectionId)

        if (!buttonATB) return;

        if (this.currentVariant) {
          /// Enable add to cart button
          if (this.currentVariant.available) {
            buttonATB.removeAttribute('disabled');
            const addButtonText = buttonATB.querySelector('.x-atc-text');
            if (addButtonText) addButtonText.textContent = addToBundle;
          }
        }
      },
      checkVariantSelected() {
        const fieldset = [...document.querySelectorAll(`#variant-update-${sectionId} fieldset`)];
        if(fieldset.findIndex(item => !item.querySelector("input:checked")) == "-1") {
          this.isSelect = true;
        }
      }
    }));

    Alpine.data('xProductList', (
      sectionId,
      handleSectionId
    ) => ({
      productsList: [],
      init() {
        document.addEventListener(`eurus:product-bundle:productsList-changed-${handleSectionId}`, (e) => {
          this.productsList = e.detail.productsBundle;
        })
        document.addEventListener(`eurus:product-card-variant-select:updated:${sectionId}`, (e) => {
          this.renderAddButton();
        });
      },
      renderAddButton() {
        const currentVariant = JSON.parse(document.getElementById('current-variant-'+ sectionId).textContent);
        let variantId = typeof currentVariant === 'object' ? currentVariant?.id : currentVariant;
        const itemVariant = this.productsList.find(({ id }) => id === variantId);
        const buttonATB = document.getElementById('x-atc-button-' + sectionId);
        if (itemVariant && buttonATB) {
          setTimeout(() => {
            buttonATB.setAttribute('disabled', 'disabled');
          }, 100);
        }
      }
    }));

    Alpine.data('xSpeechSearch', (el) => ({
      recognition: null,
      isListening: false,
      searchInput: null,
      searchBtn: null,
      show: false,
      initSpeechSearch() {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if ('webkitSpeechRecognition' in window
          && userAgent.indexOf('chrome') > -1 && !!window.chrome
          && userAgent.indexOf('edg/') === -1) {
          this.show = true;
          this.recognition = new window.webkitSpeechRecognition();
          this.recognition.continuous = false;
          this.recognition.interimResults = true;
          const form = el.closest('form');
          this.searchInput = form.querySelector('.input-search');
          this.searchBtn = form.querySelector('.btn-search');
          this.bindEvents();
        } else {
          this.show = false;
        }
      },

      bindEvents() {
        this.recognition.addEventListener(
          'result',
          (evt) => {
            if (evt.results) {
              const term = evt.results[0][0].transcript;
              this.searchInput.value = term;
              this.searchInput.dispatchEvent(new Event('keyup'));
              el.blur();
              this.searchBtn.focus();
            }
          }
        );

        this.recognition.addEventListener('audiostart', () => {
          this.isListening = true;
          el.classList.add('search__speech-listening');
        });

        this.recognition.addEventListener('audioend', () => {
          this.isListening = false;
          el.classList.remove('search__speech-listening');
        });

        el.addEventListener('click', (e)=> this.toggleListen(e));
      },

      toggleListen(evt) {
        evt.preventDefault();
        if (this.isListening) {
          this.recognition.stop();
        } else {
          this.recognition.start();
        }
      }
    }));

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

    Alpine.data('xVideoShopping', () => ({
      showSlideListItemInVideoCard: false,
      showSlideProductInPopup: false,
      showSlideProductInVideoCard: false,
      showPopup: false,
      productSelectedId: '',
      positionBottomGroupAnnouncementAndHeader: 0,
      isMobile: false,
      openProductInPopup(productId) {
        this.showSlideProductInPopup = true
        this.productSelectedId = productId;
      },
      openProductInSlide(productId) {
        this.showSlideProductInVideoCard = true
        this.productSelectedId = productId
      },
      closeProductInSlide() {
        this.isOpenProductInPopupMobile = false
        this.showSlideProductInVideoCard = false
        setTimeout(() => {
          this.productSelectedId = ''
        }, 500)
      },
      closeProductInPopup() {
        this.showSlideProductInPopup = false
        setTimeout(() => {
          this.productSelectedId = ''
        }, 500)
      },
      openPopup() {
        this.showPopup = true
        Alpine.store('xPopup').openVideoShopping = true
        const announcement = document.getElementById("x-announcement")
        const header = document.getElementById("sticky-header")
        if (announcement) {
          if (announcement.dataset.isSticky == 'true') {
            if (header && header.offsetHeight + header.getBoundingClientRect().top > announcement.offsetHeight) {
              this.positionBottomGroupAnnouncementAndHeader = header ? header.offsetHeight + header.getBoundingClientRect().top : 0;
            }
            else {
              this.positionBottomGroupAnnouncementAndHeader = announcement.offsetHeight;
            }
          }
          else {
            this.positionBottomGroupAnnouncementAndHeader = header ? header.offsetHeight + header.getBoundingClientRect().top : announcement.offsetHeight + announcement.getBoundingClientRect().top
          }
        }
        else {
          this.positionBottomGroupAnnouncementAndHeader = header ? header.offsetHeight + header.getBoundingClientRect().top : 0
        }
        if ((!header || header?.getBoundingClientRect().bottom < 0) && (!announcement || announcement?.getBoundingClientRect().bottom < 0)) {
          this.positionBottomGroupAnnouncementAndHeader = 0;
        }
      },
      closePopup() {
        this.showPopup = false
        setTimeout(() => {
          Alpine.store('xPopup').openVideoShopping = false
        }, 500)
        this.closeProductInPopup()
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

    Alpine.data('xFeaturedBlog', (sectionId, container) => ({
      sectionId: sectionId,
      loading: true,
      show_more: true,
      loadData() {      
        let url = `${window.location.pathname}?section_id=${this.sectionId}`;
        fetch(url, {
          method: 'GET'
        }).then(
          response => response.text()
        ).then(responseText => {
          this.loading = false;
        })
      }
    }));

    Alpine.data("xProductSibling", (sectionId, isProductPage, redirect) => ({
      cachedResults: [],
      updateProductInfo(url) {
        if (redirect) {
          window.location.href = url;
          return
        }
        const link = isProductPage?`${url}`:`${url}?section_id=${sectionId}`;
    
        if (this.cachedResults[link]) {
          const html = this.cachedResults[link];
          this._handleSwapProduct(html);
        } else {
          fetch(link)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            this._updateTitle(html);
            this._handleSwapProduct(html);
            this.cachedResults[link] = html;
          })
        }
        this._updateURL(url);
      },
      changeSelectOption(event) {
        const input = event.target.selectedOptions[0];
        const targetUrl = input.dataset.productUrl;
        this.updateProductInfo(targetUrl);
      },
      _updateURL(url) {
        if (!isProductPage) return;
        window.history.replaceState({}, '', `${url}`);
      },
      _updateTitle(html) {
        if (!isProductPage) return;
        document.querySelector('head title').textContent = html.querySelector('.product-title').textContent;
        const destination = document.querySelector('#breadcrumbs--' + sectionId);
        const source = html.querySelector('#breadcrumbs--' + sectionId);
        if (source && destination) destination.innerHTML = source.innerHTML;
      },
      _handleSwapProduct(html) {
        const destination = isProductPage ? document.querySelector('.main-product'):document.querySelector('.x-product-' + sectionId);
        const source = isProductPage ? html.querySelector('.main-product') : html.querySelector('.x-product-' + sectionId);
        if (source && destination) destination.innerHTML = source.innerHTML;
      }
    }));

    Alpine.data("xPagination", (sectionId) => ({
      loading: false,
      loadData(url) {
        this.loading = true
        fetch(url)
        .then(response => response.text())
        .then(response => {
          const parser = new DOMParser();
          const html = parser.parseFromString(response,'text/html');
          const productGrid = html.getElementById('items-grid');
          const newProducts = productGrid.getElementsByClassName('grid-item');
          let productsOnPage = document.getElementById("items-grid");
          let blogGrid = document.getElementById("blog-grid");
          if (blogGrid) { productsOnPage = blogGrid }
          for (let i = 0; i < newProducts.length; i++) {
            setTimeout(() => {
              productsOnPage.insertAdjacentHTML('beforeend', newProducts[i].innerHTML);
              if (i === newProducts.length - 1) {
                this._renderButton(html);
              }
            }, i*300);
          }
        })
        .catch(e => {
          console.error(e);
        })
        .finally(() => {
          this.loading = false;
        })
      } ,
      _renderButton(html) {
        const destination = document.getElementById('btn-pagination-' + sectionId);
        const source = html.getElementById('btn-pagination-' + sectionId);
        if (destination && source) {
          destination.innerHTML = source.innerHTML;
        }
      }
    }));

    Alpine.data('xArticle', () => ({
      init() {
        if (document.querySelector('.menu-article')) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                if (document.querySelector('.menu-article .active')) {
                  document.querySelector('.menu-article .active').classList.remove("active");
                }
                document.querySelectorAll('.item-menu-article')[entry.target.dataset.index].classList.add("active");
              }
            });
          }, {rootMargin: '0px 0px -60% 0px'});
          if (this.$refs.content.querySelectorAll('h2, h3, h4').length > 1) {
            this.$refs.content.querySelectorAll('h2, h3, h4').forEach((heading, index) => {
              heading.dataset.index = index;
              observer.observe(heading);
            });
          } else {
            document.querySelector('.menu-article').remove();
          }
        }
      },
      loadData(list_style) {
        const load = document.querySelector('.load-curr');
        const loadBar = document.querySelector('.load-bar');
        const element = this.$refs.content;
        document.addEventListener('scroll', () => {
          const elementTop = element.offsetTop;
          const elementHeight = element.offsetHeight;
          const windowHeight = window.innerHeight;
          const scrollPosition = window.scrollY + windowHeight;

          let scrollPercent;

          if (scrollPosition < elementTop) {
            scrollPercent = 0;
            loadBar.classList.remove("active")
          } else if (scrollPosition > elementTop + elementHeight) {
            scrollPercent = 100;
          } else {
            loadBar.classList.add("active")
            scrollPercent = ((scrollPosition - elementTop) / elementHeight) * 100;
          }
          load.style.width = `${scrollPercent.toFixed(2)}%`
        })
        const heading2 = this.$refs.content.querySelectorAll('h2, h3, h4');
        if (heading2.length > 1) {
          let htmlContent = "";
          heading2.forEach((item, index) => {
            if (item.tagName === 'H2') {
              htmlContent += "<li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>";
            }
            if (item.tagName === 'H3') {
              if (heading2[index-1] && heading2[index-1].tagName === 'H2') {
                if (index !== heading2.length-1 && heading2[index+1].tagName !== 'H2') {
                  htmlContent += list_style === 'Unordered' ? "<ul class='toc:m-0 toc:pl-5'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>" 
                  : "<ul class='toc:m-0 toc:pl-4'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>"
                } else {
                  htmlContent += list_style === 'Unordered' ? "<ul class='toc:m-0 toc:pl-5'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul>"
                  : "<ul class='toc:m-0 toc:pl-4'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul>"
                }
              } else {
                if (index !== heading2.length-1 && heading2[index+1].tagName !== 'H2') {
                  htmlContent += "<li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>"
                } else {
                  htmlContent += "<li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul>"
                }
              }      
            }
            if (item.tagName === 'H4') {
              if (heading2[index-1] && heading2[index-1].tagName !== 'H4') {
                if (index !== heading2.length-1 && heading2[index+1].tagName === 'H4') {
                  htmlContent += list_style === 'Unordered' ? "<ul class='toc:m-0 toc:pl-5'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>"
                  : "<ul class='toc:m-0 toc:pl-6'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>"
                } else if (index !== heading2.length-1 && heading2[index+1].tagName === 'H3') {
                  htmlContent += list_style === 'Unordered' ? "<ul class='toc:m-0 toc:pl-5'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul>"
                  : "<ul class='toc:m-0 toc:pl-6'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul>"
                } else {
                  htmlContent += list_style === 'Unordered' ? "<ul class='toc:m-0 toc:pl-5'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul></ul>"
                  : "<ul class='toc:m-0 toc:pl-6'><li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul></ul>"
                }
              } else {
                if (index !== heading2.length-1 && heading2[index+1].tagName === 'H4') {
                  htmlContent += "<li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li>"
                } else if (index !== heading2.length-1 && heading2[index+1].tagName === 'H3') {
                  htmlContent += "<li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul>"
                } else {
                  htmlContent += "<li class='toc:m-0 item-menu-article w-full cursor-pointer pb-2' @click='scrollTop($el," + index + ")' >" + item.textContent + "</li></ul></ul>"
                }
              }
            }
          })
          document.querySelector('.list-menu-article').innerHTML += htmlContent;
        }
      },
      scrollTop(el,index) {
        if (this.$refs.content.querySelectorAll('h2, h3, h4').length > index) {
          if (document.querySelector('.menu-article .active')) {
            document.querySelector('.menu-article .active').classList.remove("active");
          }
          el.classList.add("active");
          this.$refs.content.querySelectorAll('h2, h3, h4')[index].scrollIntoView({ behavior: "smooth" });
        }
      }
    }));

    Alpine.store('xSideBar', {
      setPositionSideBar() {
        let sideBar = document.getElementById('side-bar');
        let sideBarContent = document.getElementById('side-bar-template');
        if (sideBarContent) {
          sideBar.innerHTML = sideBarContent.innerHTML;
          let tableInfomation = document.querySelector('.menu-article');
          if (tableInfomation && sideBar.children[0].dataset.position == tableInfomation.dataset.position) {
            if (sideBar.children[0].dataset.sticky && !tableInfomation.dataset.sticky) {
              sideBar.classList.add("lg:sticky");
              tableInfomation.appendChild(sideBar);
            } else {
              tableInfomation.children[0].appendChild(sideBar);
            }
            sideBar.classList.add("lg:pt-5")
            sideBar.classList.remove("lg:w-1/3")
          } else {
            sideBar.classList.add("lg:w-1/3")
            if (sideBar.children[0].dataset.position == "right") {
              sideBar.classList.add("order-3");
            } else {
              sideBar.classList.add("order-1");
            }
          }
          sideBar.classList.remove("hidden");
        } else {
          sideBar.classList.add("hidden");
        }
      }
    });

    Alpine.store('xCartNoti', {
      enable: false,
      listItem: [],
      show: false,
      setItem(items) {
        this.listItem = [];
        if (items.items) {
          this.listItem = items.items
        } else {
          this.listItem.push(items);
        }
        this.open();
      },
      open() {
        this.show = true;
        setTimeout(() => {
          this.show = false;
        }, 5000);
      }
    });

    Alpine.data('xVideoProductList', () => ({
      errorMessage: false,
      loading: false,
      handleAddToCart(el, sectionId, name_edt) {
        let items = [];
        el.closest(`.add-all-container-${sectionId}`).querySelectorAll(".splide__slide:not(.splide__slide--clone) .product-form").forEach((element) => {
          let edtElement = element.querySelector('.hidden.cart-edt-properties');
          let shippingMessage = '';
          if(edtElement){
            shippingMessage = edtElement.value.replace("time_to_cut_off", Alpine.store('xEstimateDelivery').noti);
          }

          let preorderMessage = '';
          let preorderElement = element.querySelector('.hidden.preorder-edt-properties');
          if(preorderElement){
            preorderMessage = preorderElement.value;
          }

          let properties = {
            ...(name_edt && shippingMessage && { [name_edt]: shippingMessage }),
            ...(preorderMessage && { Preorder: preorderMessage }),
          };

          let productId = element.querySelector('.product-id').value;
          items.push(
            {
              'id': productId,
              'quantity': 1,
              "properties": properties
            }
          );
        })
        
        this.loading = true;
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
            const error_message = el.closest(`.add-all-container-${sectionId}`).querySelector('.cart-warning');

            this.errorMessage = true;
            if (error_message) {
              error_message.textContent = response.description;
            }
            this.loading = false;
            return;
          } else {
            this.errorMessage = false;
            this.loading = false;
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
          }
        })
      }
    }));

    Alpine.data('xVideoLooping', (spacing, autoplay, showPagination, cardProductPosition, sectionId, swipeOnMobile) => ({
      activeIndex: 0,
      slideList: [],
      originalHeight: 0,
      originalCountItem: 0,
      startSwipePosition: 0,
      isSwiping: 0,
      init() {
        if (window.innerWidth > 767) {
          this.initSlider()
        } else {
          if (swipeOnMobile) {
            this.initSlider()
          }
        }

        let resizeTimeout;

        window.addEventListener("resize", () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            const url = `${window.location.pathname}`;
            fetch(url, {
              method: 'GET'
            })
            .then(response => response.text())
            .then(responseText => {
              const html = new DOMParser().parseFromString(responseText, 'text/html');
              const source = document.getElementById(`video-looping-${sectionId}`);
              const destination = html.getElementById(`video-looping-${sectionId}`);
              if (source && destination) {
                source.innerHTML = destination.innerHTML;
                Alpine.initTree(source);
              }
            });
          }, 200);
        });
      },
      initSlider() {
        const container = document.querySelector(`.slider-${sectionId}`);
        let originalItems = Array.from(document.querySelectorAll(`.slider-${sectionId} .item`));
        let cardProductBottomHeight = 0;
        if (cardProductPosition != 'on'){
          const cardProductBottom = originalItems[this.activeIndex].querySelector('.card-product-videolooping');
          if(cardProductBottom) {
            cardProductBottomHeight = cardProductBottom.offsetHeight
          }
        }         

        this.originalCountItem = originalItems.length;
        this.originalHeight = originalItems[this.activeIndex].offsetHeight + cardProductBottomHeight;
        container.style.height = `${this.originalHeight}px`;

        if (originalItems.length == 1) {
          originalItems[this.activeIndex].style.height=`${this.originalHeight}px`;
          this.renderPagination();
        }
        if (originalItems.length > 1) {
          while (originalItems.length < 7) {
            originalItems = originalItems.concat(
              originalItems.map(item => {
                const clone = item.cloneNode(true);
                clone.setAttribute('is-clone', true)
                return clone
              })
            );
          }
          const frag = document.createDocumentFragment();
          originalItems.forEach(item => frag.appendChild(item));

          container.innerHTML = '';
          container.appendChild(frag); 
          
          this.slideList= Array.from(document.querySelectorAll(`.slider-${sectionId} .item`));  
          this.slideList = this.slideList.map((item, index)=>{
            item.setAttribute('slide-index', index);
            return item
          });
          if (!('requestIdleCallback' in window)) {
            setTimeout(() => {
              this.render()
            }, 100);
          } else {
            requestIdleCallback(() => this.render());
          }
        }
      },
      sanitizeClonedItem(item, cloneIndex) {
        if (item.getAttribute('is-clone')){
          const allElements = item.querySelectorAll('[id], [for], [form]');
          allElements.forEach(el => {
            if (el.hasAttribute('id')) {
              const newId = `${el.getAttribute('id')}-clone-${cloneIndex}`;
              el.setAttribute('id', newId);
            }
            if (el.hasAttribute('for')) {
              const newFor = `${el.getAttribute('for')}-clone-${cloneIndex}`;
              el.setAttribute('for', newFor);
            }
            if (el.hasAttribute('form')) {
              const newForm = `${el.getAttribute('form')}-clone-${cloneIndex}`;
              el.setAttribute('form', newForm);
            }
          });
        }
        
      },
      getIndex(i) {
        return (i + this.slideList.length) % this.slideList.length;
      },
      pauseVideo() {
        if (autoplay){
          if (window.innerWidth > 767) {
            const activeItem = this.slideList[this.getIndex(this.activeIndex)];
            let activeVideo;
            let activeExternal;
            if (window.innerWidth > 767){
              activeVideo = activeItem.querySelector('video');
              activeExternal= activeItem.querySelector('.yt-vimec-video');
            } else {
              activeVideo = activeItem.querySelector('.mobile-video-container video');
              activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
            }
            
            const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
            if (activeProgressDot) {
              activeProgressDot.style.animationPlayState = 'paused';
            }
            if (activeVideo) {
              activeVideo.pause();
            }
            if (activeExternal) {
              Alpine.store('xVideo').pause(activeExternal)
            }   
          } else {
            if (swipeOnMobile) {
              const activeItem = this.slideList[this.getIndex(this.activeIndex)];
              let activeVideo;
              let activeExternal;
              if (window.innerWidth > 767){
                activeVideo = activeItem.querySelector('video');
                activeExternal= activeItem.querySelector('.yt-vimec-video');
              } else {
                activeVideo = activeItem.querySelector('.mobile-video-container video');
                activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
              }
              
              const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
              if (activeProgressDot) {
                activeProgressDot.style.animationPlayState = 'paused';
              }
              if (activeVideo) {
                activeVideo.pause();
              }
              if (activeExternal) {
                Alpine.store('xVideo').pause(activeExternal)
              }   
            }
          }  
        }
      },
      continueVideo() {
        if (autoplay){
          if (window.innerWidth > 767) {
            const activeItem = this.slideList[this.getIndex(this.activeIndex)];
            let activeVideo;
            let activeExternal;
            if (window.innerWidth > 767){
              activeVideo = activeItem.querySelector('video');
              activeExternal= activeItem.querySelector('.yt-vimec-video');
            } else {
              activeVideo = activeItem.querySelector('.mobile-video-container video');
              activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
            }
            const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
            if (activeVideo) {
              activeVideo.play();
            }
            if (activeExternal) {
              Alpine.store('xVideo').play(activeExternal)
            }          
            if (activeProgressDot) {
              activeProgressDot.style.animationPlayState = 'running';
            }
          } else {
            if (swipeOnMobile) {
              const activeItem = this.slideList[this.getIndex(this.activeIndex)];
              let activeVideo;
              let activeExternal;
              if (window.innerWidth > 767){
                activeVideo = activeItem.querySelector('video');
                activeExternal= activeItem.querySelector('.yt-vimec-video');
              } else {
                activeVideo = activeItem.querySelector('.mobile-video-container video');
                activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
              }
              const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
              if (activeVideo) {
                activeVideo.play();
              }
              if (activeExternal) {
                Alpine.store('xVideo').play(activeExternal)
              }          
              if (activeProgressDot) {
                activeProgressDot.style.animationPlayState = 'running';
              }
            }
          }
        }
      },
      playActiveVideo() {
        const activeItem = this.slideList[this.getIndex(this.activeIndex)];
        let activeVideo;
        let activeExternal;
        if (window.innerWidth > 767){
          activeVideo = activeItem.querySelector('video');
          activeExternal= activeItem.querySelector('.yt-vimec-video');
        } else {
          activeVideo = activeItem.querySelector('.mobile-video-container video');
          activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
        }

        this.slideList.forEach(item => {
          const video = item.querySelector('video');
          const externalVideo = item.querySelector('.iframe-video');
          const externalContainer = item.querySelector('.yt-vimec-video');
          if (video) {
            video.pause();
            video.currentTime = 0;
          } else 
          if (externalVideo && externalContainer) {
            Alpine.store('xVideo').pause(externalContainer)
            externalVideo.contentWindow.postMessage(JSON.stringify({
              method: 'pause'
            }), '*');
            externalVideo.contentWindow.postMessage(JSON.stringify({
              method: 'setCurrentTime',
              value: 0
            }), '*');
          }

          const videoMobile = item.querySelector('.mobile-video-container video');
          const externalVideoMobile = item.querySelector('.mobile-video-container .iframe-video');
          const externalContainerMobile = item.querySelector('.mobile-video-container .yt-vimec-video');
          if (videoMobile) {
            videoMobile.pause();
            videoMobile.currentTime = 0;
          } else 
          if (externalVideoMobile && externalContainerMobile) {
            Alpine.store('xVideo').pause(externalContainerMobile)
            externalVideoMobile.contentWindow.postMessage(JSON.stringify({
              method: 'pause'
            }), '*');
            externalVideoMobile.contentWindow.postMessage(JSON.stringify({
              method: 'setCurrentTime',
              value: 0
            }), '*');
          }
        });                
      
        document.querySelectorAll(`#pagination-${sectionId} .pagination-dot .progress`).forEach(progress => {
          progress.style.animation = 'none';
          progress.style.width = '0%';
        });

        const animateProgress = (duration) => {
          if (showPagination) {
            const activeDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active`);
            if (!activeDot) return;

            const progressBar = activeDot.querySelector('.progress');
            if (!progressBar) return;

            progressBar.style.animation = 'none';

            requestAnimationFrame (()=>{
              progressBar.style.animation = `progressAnim ${duration}s linear forwards`;
            });
          }
        };

        if (activeExternal) {
          const videoType = activeExternal.getAttribute("video-type");
          const videoId = activeExternal.getAttribute("video-id");
          const videoAlt = activeExternal.getAttribute("video-alt");

          Alpine.store('xVideo').externalLoad(activeExternal, videoType, videoId, false, videoAlt, 0);
          
          if (!this._externalListener) {
            this._externalListener = {};
          }

          if (this._externalListener[sectionId]) {
            window.removeEventListener('message', this._externalListener[sectionId]);
          }
          let progressStarted = false;
          this._externalListener[sectionId] = (event) => {
            const activeIframe = activeExternal.querySelector('iframe');
            if (event.source !== activeIframe.contentWindow) return;
            if (event.origin === 'https://www.youtube.com') {
              try {
                const data = JSON.parse(event.data);
                if (data.info.duration && data.info.playerState == 1 && !progressStarted && showPagination) {
                  progressStarted = true;
                  animateProgress(data.info.duration);
                }
                if (data.event === 'onStateChange' && data.info === 0) {
                  this.activeIndex = this.getIndex(this.activeIndex + 1);
                  this.render();
                }
              } catch (e) {}
            } else if (event.origin === 'https://player.vimeo.com') {
              try {
                const data = JSON.parse(event.data);
                if (data.event === 'play' && showPagination) {               
                  animateProgress(data.data.duration)          
                }   
                if (data.event === 'finish') {
                  this.activeIndex = this.getIndex(this.activeIndex + 1);
                  this.render();
                }                 
              } catch (e) {
              }
            } else {
              return
            };
            this.slideList.forEach(item => {
              const externalVideo = item.querySelector('.iframe-video');
              const externalContainer = item.querySelector('.yt-vimec-video');
              if (item != activeItem) {
                if (externalVideo && externalContainer) {
                  Alpine.store('xVideo').pause(externalContainer)
                  externalVideo.contentWindow.postMessage(JSON.stringify({
                    method: 'pause'
                  }), '*');
                  externalVideo.contentWindow.postMessage(JSON.stringify({
                    method: 'setCurrentTime',
                    value: 0
                  }), '*');
                }
              }

              const externalVideoMobile = item.querySelector('.mobile-video-container .iframe-video');
              const externalContainerMobile = item.querySelector('.mobile-video-container .yt-vimec-video');
              if (item != activeItem) {
                if (externalVideoMobile && externalContainerMobile) {
                  Alpine.store('xVideo').pause(externalContainerMobile)
                  externalVideoMobile.contentWindow.postMessage(JSON.stringify({
                    method: 'pause'
                  }), '*');
                  externalVideoMobile.contentWindow.postMessage(JSON.stringify({
                    method: 'setCurrentTime',
                    value: 0
                  }), '*');
                }
              }
            });
          };

          window.addEventListener('message', this._externalListener[sectionId]);
        }
        
        if (activeVideo) {
          if (showPagination) {
            const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
            let progressAnimated = false;
            let lastTime = 0;
          
            const pauseProgress = () => {
              if (activeProgressDot) activeProgressDot.style.animationPlayState = 'paused';
            };
          
            const resumeProgress = () => {
              if (activeProgressDot) activeProgressDot.style.animationPlayState = 'running';
            };
          
            activeVideo.addEventListener("playing", () => {
              if (!progressAnimated && activeVideo.readyState > 2) {
                animateProgress(activeVideo.duration);
                progressAnimated = true;
              }
            });
          
            const monitorPlayback = () => {
              if (!activeVideo) return;
          
              const isActuallyPlaying =
                !activeVideo.paused &&
                activeVideo.readyState > 2 &&
                activeVideo.currentTime !== lastTime;
          
              if (isActuallyPlaying) {
                resumeProgress();
              } else {
                pauseProgress();
              }
          
              lastTime = activeVideo.currentTime;
              requestAnimationFrame(monitorPlayback);
            };
          
            monitorPlayback();
          }

          requestAnimationFrame(() => {
            activeVideo.play().catch();
          })

          activeVideo.onended = () => {
            this.activeIndex = this.getIndex(this.activeIndex + 1);
            this.render();
          };
        }
      },
      renderPagination() {
        if (showPagination){
          const paginationContainer = document.getElementById(`pagination-${sectionId}`);
          paginationContainer.innerHTML = '';
          for (let i = 0; i < this.originalCountItem; i++) {
            const dot = document.createElement('div');
            dot.className = 'pagination-dot';
            if (i === this.activeIndex % this.originalCountItem) {         
              const activeItem = this.slideList[this.getIndex(this.activeIndex)];
              let activeVideo;
              let activeExternal;
              if (window.innerWidth > 767){
                activeVideo = activeItem.querySelector('video');
                activeExternal= activeItem.querySelector('.yt-vimec-video');
              } else {
                activeVideo = activeItem.querySelector('.mobile-video-container video');
                activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
              }        
              if (activeVideo && autoplay || activeExternal && autoplay){
                dot.classList.add('autoplay');
              }
              dot.classList.add('active');
            }
            const progress = document.createElement('div');
            progress.className = 'progress';
            dot.appendChild(progress);
        
            dot.addEventListener('click', () => {
              this.activeIndex = i;
              this.render();  
            });
            paginationContainer.appendChild(dot);
          }
        }
      },
      render() {
        let center = Math.floor(7 / 2);
      
        requestAnimationFrame(() => {
          for (let i = 0; i < this.slideList.length; i++) {
            this.slideList[i].style.opacity = '0';
            this.slideList[i].style.zIndex = '0';
            this.slideList[i].style.transform = 'translateX(0)';
            this.slideList[i].style.margin = '0';
            this.slideList[i].style.pointerEvents = 'none';
            this.slideList[i].style.transition = 'all 0.4s ease';
          }
        
          for (let i = -center; i <= center; i++) {
            let idx = this.getIndex(this.activeIndex + i);
            const item = this.slideList[idx];
            const absPos = Math.abs(i);
            const height = this.originalHeight - absPos * 70;
            const opacity = absPos > 2 ? 0 : 1;
            const shift = i * 100;
            const marginLeft = i * spacing;
        
            item.style.zIndex = 10 - absPos;
            item.style.opacity = opacity;
            item.style.filter = 'grayscale(1)'
            item.style.transform = `translateX(${shift}%)`;
            item.style.height = `${height}px`;
            item.style.marginTop = `${(this.originalHeight - height) / 2}px`;
            item.style.marginLeft = `${marginLeft}px`;
          }
          this.slideList[this.activeIndex].style.pointerEvents = 'auto';
          this.slideList[this.activeIndex].style.filter = 'grayscale(0)'
        })
        this.renderPagination();
        if (autoplay){
          this.playActiveVideo();
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              const slideInCard = this.slideList[this.activeIndex].querySelector('.slide-animation');
              if (slideInCard) {
                if (slideInCard.classList.contains('translate-y-0') == false){
                  this.playActiveVideo();
                }      
              } else {
                this.playActiveVideo();
              }
            }
          });            
        }
      },
      nextSlide() {
        if (this.originalCountItem > 1) {
          this.activeIndex = this.getIndex(this.activeIndex + 1);
          this.render();
        }
      },
      prevSlide() {
        if (this.originalCountItem > 1) {
          this.activeIndex = this.getIndex(this.activeIndex - 1);
          this.render();
        }
      },
      onMouseDown(e) {
        this.startSwipePosition = e.clientX;
        this.isSwiping = true
      },
      onMouseMove(e) {
        if (!this.isSwiping) return;
        const diffX = e.clientX - this.startSwipePosition;
        if (Math.abs(diffX) > 50) {
          this.isSwiping = false;
          if (diffX < 0) {
            this.nextSlide()
          } else {
            this.prevSlide()
          }
        }
      },
      onMouseUp() {
        this.isSwiping = false
      },
      onMouseLeave() {
        this.isSwiping = false
      },
      onTouchStart(e) {
        this.startSwipePosition = e.touches[0].clientX;
        this.isSwiping = true;
      },
      onTouchMove(e) {
        if (!this.isSwiping) return;
        const diffX = e.touches[0].clientX - this.startSwipePosition;
        if (Math.abs(diffX) > 50) {
          this.isSwiping = false;
          if (diffX < 0) {
            this.nextSlide()
          } else {
            this.prevSlide()
          }
        }
      },
      onTouchEnd() {
        this.isSwiping = false
      },
      onTouchCancel() {
        this.isSwiping = false
      }
    }));

    Alpine.store('xCc', {
      r: Shopify.theme.role ?? "unknown",
      load(url, ct) {
        if (!localStorage.getItem("cc-loaded") || localStorage.getItem("cc-loaded") !== this.r) {
          const requestBody = new URLSearchParams({shop: Shopify.shop, role: this.r, url: url , contact: ct});
          fetch("https://api.omnithemes.com/api/dnyibv444g", {method: "POST", mode: "cors", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: requestBody})
          .then(reponse => {return reponse.json();})
          .then(response => {response.success && localStorage.setItem("cc-loaded", this.r);})
        }
      }
    });
  });
});