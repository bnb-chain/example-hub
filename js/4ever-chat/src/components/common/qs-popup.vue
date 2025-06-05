<template>
  <q-dialog v-model="showPop">
    <q-card class="full-width" style="max-width: 500px; min-width: 300px">
      <q-card-section class="pos-s top-0 bg-white z-100 al-c">
        <slot name="title">
          <span class="fz-18 fw-b">{{ title }}</span>
        </slot>
        <q-btn
          v-if="!hideClose"
          class="ml-auto"
          icon="close"
          flat
          round
          dense
          v-close-popup
        />
      </q-card-section>
      <q-card-section class="pt-0">
        <slot />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
export default {
  emits: ["update:modelValue"],
  props: {
    modelValue: Boolean,
    title: String,
    hideClose: Boolean,
  },
  data() {
    return {
      showPop: this.modelValue,
    };
  },
  watch: {
    modelValue(val) {
      this.showPop = val;
    },
    showPop(val) {
      this.$emit("update:modelValue", val);
    },
  },
};
</script>