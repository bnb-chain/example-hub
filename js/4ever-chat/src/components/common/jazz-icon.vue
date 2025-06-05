<template>
  <div ref="content" class="al-c"></div>
</template>

<script>
import jazzicon from "jazzicon";

export default {
  props: {
    hash: String,
    size: {
      default: 34,
      type: Number,
    },
  },
  data() {
    return {
      iconDom: null,
    };
  },
  watch: {
    hash() {
      this.getIcon();
    },
  },
  mounted() {
    this.getIcon();
  },
  computed: {
    addrSeed() {
      const addr = (this.hash || "").slice(2, 10);
      const seed = parseInt(addr, 16);
      return seed;
    },
  },
  methods: {
    getIcon() {
      if (!this.hash) return;
      const identicon = jazzicon(this.size, this.addrSeed);
      this.iconDom = identicon.cloneNode(true);
      const $con = this.$refs.content;
      [].slice.call($con.children).forEach((el) => {
        $con.removeChild(el);
      });
      $con.appendChild(this.iconDom);
    },
  },
};
</script>
