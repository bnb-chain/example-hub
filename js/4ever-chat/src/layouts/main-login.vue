<style lang="scss">
.btn-al-left {
  .q-btn__content {
    justify-content: flex-start;
    text-align: left;
  }
}
@media screen and (max-width: 600px) {
  .btn-al-left {
    .fz-18 {
      font-size: 15px;
      margin-left: 0;
    }
  }
}
</style>

<template>
  <div style="height: 20vh"></div>
  <div class="al-c f-center">
    <div class="bg-white bd-1 pa-6 w100p bdrs-9" style="max-width: 500px">
      <div class="fz-20 fw-b mb-5">Sign in to 4EVER Chat</div>
      <q-btn
        color="primary"
        outline
        size="lg"
        class="w100p btn-al-left"
        style="background: #f2e8fd !important"
        @click="onLogin"
      >
        <div class="al-c ml-3 fz-18">
          <img src="/img/sign-in.svg" width="24" />
          <span class="ml-3">Sign in</span>
        </div>
      </q-btn>
      <div class="pt-5 pb-2 gray fz-17">or</div>
      <q-btn
        outline
        flat
        size="lg"
        class="w100p btn-al-left bd-1"
        @click="$bus.emit('show-import')"
      >
        <div class="al-c ml-3 fz-18">
          <img src="/img/import-key.svg" width="24" />
          <span class="ml-3">Import a 4EVERLAND AI RPC key</span>
        </div>
      </q-btn>
      <div class="pa-1"></div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {};
  },
  methods: {
    onLogin() {
      this.$router.replace("/login");
    },
  },
};
</script>