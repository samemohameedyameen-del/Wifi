const STORAGE_KEY = "wifi-owners-app-v1";

const initialState = {
  plans: [],
  subscribers: [],
  payments: []
};

const state = loadState();

const planForm = document.getElementById("planForm");
const subscriberForm = document.getElementById("subscriberForm");
const paymentForm = document.getElementById("paymentForm");

const plansList = document.getElementById("plansList");
const subscribersList = document.getElementById("subscribersList");
const paymentsList = document.getElementById("paymentsList");

const subscriberPlanSelect = document.getElementById("subscriberPlan");
const paymentSubscriberSelect = document.getElementById("paymentSubscriber");

planForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("planName").value.trim();
  const price = Number(document.getElementById("planPrice").value);

  if (!name || price <= 0) return;

  state.plans.push({ id: crypto.randomUUID(), name, price });
  saveAndRender();
  planForm.reset();
});

subscriberForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("subscriberName").value.trim();
  const phone = document.getElementById("subscriberPhone").value.trim();
  const planId = subscriberPlanSelect.value;

  if (!name || !phone || !planId) return;

  state.subscribers.push({
    id: crypto.randomUUID(),
    name,
    phone,
    planId
  });

  saveAndRender();
  subscriberForm.reset();
});

paymentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const subscriberId = paymentSubscriberSelect.value;
  const month = document.getElementById("paymentMonth").value;

  if (!subscriberId || !month) return;

  const existing = state.payments.find(
    (payment) => payment.subscriberId === subscriberId && payment.month === month
  );

  if (existing) {
    alert("هذا المشترك مسجل كدافع في هذا الشهر مسبقًا.");
    return;
  }

  state.payments.push({
    id: crypto.randomUUID(),
    subscriberId,
    month,
    paidAt: new Date().toISOString()
  });

  saveAndRender();
  paymentForm.reset();
});

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(initialState);

  try {
    const parsed = JSON.parse(raw);
    return {
      plans: parsed.plans ?? [],
      subscribers: parsed.subscribers ?? [],
      payments: parsed.payments ?? []
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function render() {
  renderPlans();
  renderSubscribers();
  renderPayments();
  renderStats();
  bindPlanOptions();
  bindSubscriberOptions();
}

function renderPlans() {
  plansList.innerHTML = "";

  state.plans.forEach((plan) => {
    appendListItem(
      plansList,
      `${plan.name} — ${plan.price.toLocaleString("ar-EG")} د.ع شهريًا`,
      () => {
        state.plans = state.plans.filter((item) => item.id !== plan.id);
        const removedSubscriberIds = state.subscribers
          .filter((sub) => sub.planId === plan.id)
          .map((sub) => sub.id);

        state.subscribers = state.subscribers.filter((sub) => sub.planId !== plan.id);
        state.payments = state.payments.filter(
          (payment) => !removedSubscriberIds.includes(payment.subscriberId)
        );
        saveAndRender();
      }
    );
  });
}

function renderSubscribers() {
  subscribersList.innerHTML = "";

  state.subscribers.forEach((subscriber) => {
    const plan = state.plans.find((item) => item.id === subscriber.planId);
    const planName = plan ? plan.name : "باقة محذوفة";

    appendListItem(
      subscribersList,
      `${subscriber.name} (${subscriber.phone}) — ${planName}`,
      () => {
        state.subscribers = state.subscribers.filter((item) => item.id !== subscriber.id);
        state.payments = state.payments.filter(
          (payment) => payment.subscriberId !== subscriber.id
        );
        saveAndRender();
      }
    );
  });
}

function renderPayments() {
  paymentsList.innerHTML = "";

  const sorted = [...state.payments].sort((a, b) => b.month.localeCompare(a.month));

  sorted.forEach((payment) => {
    const subscriber = state.subscribers.find((sub) => sub.id === payment.subscriberId);
    if (!subscriber) return;

    appendListItem(
      paymentsList,
      `${subscriber.name} — شهر ${payment.month}`,
      () => {
        state.payments = state.payments.filter((item) => item.id !== payment.id);
        saveAndRender();
      }
    );
  });
}

function renderStats() {
  document.getElementById("statSubscribers").textContent = state.subscribers.length;
  document.getElementById("statPlans").textContent = state.plans.length;

  const latestMonth = currentMonth();
  const revenue = state.payments
    .filter((payment) => payment.month === latestMonth)
    .reduce((sum, payment) => {
      const subscriber = state.subscribers.find((sub) => sub.id === payment.subscriberId);
      if (!subscriber) return sum;
      const plan = state.plans.find((item) => item.id === subscriber.planId);
      return sum + (plan?.price ?? 0);
    }, 0);

  document.getElementById("statRevenue").textContent =
    `${revenue.toLocaleString("ar-EG")} د.ع`;
}

function bindPlanOptions() {
  const options = state.plans
    .map((plan) => `<option value="${plan.id}">${plan.name} - ${plan.price}</option>`)
    .join("");

  subscriberPlanSelect.innerHTML = '<option value="">اختر باقة</option>' + options;
}

function bindSubscriberOptions() {
  const options = state.subscribers
    .map((subscriber) => `<option value="${subscriber.id}">${subscriber.name}</option>`)
    .join("");

  paymentSubscriberSelect.innerHTML =
    '<option value="">اختر مشترك</option>' + options;
}

function appendListItem(listElement, content, onDelete) {
  const template = document.getElementById("listItemTemplate");
  const clone = template.content.cloneNode(true);

  clone.querySelector(".content").textContent = content;
  clone.querySelector("button").addEventListener("click", onDelete);

  listElement.append(clone);
}

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

render();
