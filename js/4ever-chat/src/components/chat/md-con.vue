
<template>
  <div v-if="!content">
    <!-- <q-skeleton type="text" width="40px" /> -->
    <div style="width: 30px; height: 21px" class="pos-r">
      <div class="pos-center">
        <q-spinner-dots color="primary" size="25px" />
      </div>
    </div>
  </div>
  <div v-else class="md-con" v-html="htmlCon" />
</template>

<script>
export default {
  props: {
    content: String,
  },
  computed: {
    htmlCon() {
      return window.markdownIt
        .render(this.content)
        .replace(/<a\s/gm, '<a target="_blank" ')
        .replace('target="_blank" href="#', 'href="#');
    },
  },
};
</script>

<style lang="scss" >
.md-con {
  line-height: 1.4;
  word-break: break-word;
  pre {
    white-space: pre-wrap;
    tab-size: 2;
  }
  h1,
  h2,
  h3 {
    margin: 10px 0;
  }
  h1 {
    font-size: 24px;
  }
  h2 {
    font-size: 20px;
  }
  h3 {
    font-size: 18px;
  }
  p {
    margin-bottom: 10px;
    &:last-of-type {
      margin-bottom: 0;
    }
  }
  ol {
    margin: 0 0 10px;
    padding-left: 20px;
    li {
      margin-top: 10px;
      color: #444;
      font-size: 14px;
    }
  }
}
</style>
