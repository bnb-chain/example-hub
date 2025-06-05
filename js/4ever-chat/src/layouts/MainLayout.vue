<style lang="scss">
</style>

<script setup>
// import MainLogin from "./main-login.vue";
import ChatHeader from "./chat-header.vue";
</script>

<template>
  <div class="">
    <!-- <main-login v-if="!token && !apiKey" /> -->
    <q-layout
      view="lHh Lpr lFf"
      class="bg-white"
      :style="{
        height: screen.height + 'px',
      }"
      container
    >
      <q-drawer
        class="bg-left"
        :width="290"
        v-model="showLeft"
        show-if-above
        :breakpoint="900"
      >
        <chat-menu />
      </q-drawer>
      <q-page-container>
        <div class="h-flex h100p">
          <chat-header />
          <div class="flex-1">
            <!-- <div>{{ screen.height }}</div> -->
            <router-view />
          </div>
        </div>
      </q-page-container>

      <q-drawer
        side="right"
        :width="path == '/' ? 290 : 0"
        v-model="showRight"
        show-if-above
        :breakpoint="900"
        class="bg-f2"
      >
        <model-list v-show="!configModelId" />
        <model-settings v-show="!!configModelId" />
      </q-drawer>
    </q-layout>
  </div>

  <import-key-pop />
</template>

<script>
import { mapState } from "vuex";
import { useQuasar } from "quasar";

export default {
  data() {
    const { screen } = useQuasar();
    const isOpen = screen.width > 900;
    return {
      screen,
      showLeft: isOpen,
      showRight: isOpen,
    };
  },
  computed: {
    ...mapState({
      token: (s) => s.loginData.token,
      apiKey: (s) => s.apiKey,
      configModelId: (s) => s.configModelId,
    }),
    asPC() {
      return this.screen.width > 900;
    },
    path() {
      return this.$route.path;
    },
  },
  watch: {
    showLeft(val) {
      this.$setState({
        isLeftOpen: val,
      });
    },
    showRight(val) {
      this.$setState({
        isRightOpen: val,
      });
    },
    asPC(val) {
      this.$setState({
        asPC: val,
      });
    },
  },
  mounted() {
    if (!this.asPC) {
      this.$setState({
        asPC: false,
      });
    }
    this.$bus.on("toggleMenu", (side) => {
      this.onToggle(side);
    });
    this.$bus.on("close-left", () => {
      if (!this.asPC) this.showLeft = false;
    });
    this.$setState({
      isLeftOpen: this.showLeft,
      isRightOpen: this.showRight,
    });
  },
  methods: {
    onToggle(side) {
      if (side == "right") {
        this.showRight = !this.showRight;
      } else {
        this.showLeft = !this.showLeft;
      }
    },
  },
};
</script>
