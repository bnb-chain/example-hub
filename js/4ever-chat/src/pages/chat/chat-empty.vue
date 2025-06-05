<template>
  <div class="pos-center" style="width: 80%">
    <div class="ta-c">
      <img src="/img/logo-m.svg" style="height: 50px" />
    </div>
    <div class="row q-col-gutter-md mt-6">
      <div class="col-6 col-lg-3" v-for="it in list" :key="it.icon">
        <div class="bg-left pa-2 bdrs-5 hover-1" @click="setInput(it.desc)">
          <img :src="`/img/chat/${it.icon}.svg`" width="24" />
          <div class="fz-14 label-0 line-2" style="min-height: 42px">
            {{ it.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      list: [
        {
          icon: "light",
          title: "Exercise and fitness routines",
          desc: "What are some effective exercise and fitness routines for staying healthy?",
        },
        {
          icon: "edit",
          title: "Travel tips and itineraries",
          desc: "Can you help me with some useful travel tips and suggested itineraries for popular destinations?",
        },
        {
          icon: "star",
          title: "Career development and job hunting",
          desc: "Can you share some guidance on how to advance professionally and effectively navigate the job market?",
        },
        {
          icon: "code",
          title: "Personal finance and budgeting",
          desc: "Can you offer advice on personal finance management and budgeting strategies?",
        },
      ],
    };
  },
  methods: {
    setInput(val) {
      this.$bus.emit("send-msg", val);
    },
  },
};
</script>